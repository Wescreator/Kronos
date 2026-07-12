const bcrypt = require('bcryptjs')
const AppError = require('../utils/AppError')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const jwtConfig   = require('../config/jwt')
const userRepo    = require('../repositories/user.repository')
const companyRepo = require('../repositories/company.repository')
const emailService = require('./email.service')

// Roles que não pertencem a nenhuma empresa (escopo global da plataforma)
const GLOBAL_ROLES = ['developer', 'support']

/**
 * Monta o payload de autenticação a partir do usuário.
 *
 * Roles globais (developer/support) → scope: 'global', sem company_id.
 * Demais usuários → busca o vínculo ativo em company_users e usa
 * o role e company_id de lá (fonte de verdade para usuários de empresa).
 */
async function buildAuthPayload(user, tokenVersion = 0) {
  // token_version entra no payload para permitir invalidação de sessão:
  // reset de senha / logout incrementam a versão no banco e os tokens
  // antigos deixam de casar no refresh. Default 0 (compat com tokens
  // legados e ambientes sem a coluna).
  const tv = tokenVersion ?? 0

  // 🔴 USUÁRIOS GLOBAIS (DEV / SUPORTE)
  if (GLOBAL_ROLES.includes(user.role)) {
    return {
      user_id: user.id,
      company_id: null,
      scope: 'global',
      role: user.role,
      token_version: tv,
    }
  }

  const companyUser = await companyRepo.findActiveCompanyUserByUserId(user.id)

  /**
   * REGRA DE SEGURANÇA:
   * - prioridade: company_users (fonte oficial multi-tenant)
   * - fallback: users.company_id (apenas compatibilidade pós-migração)
   */
  const companyId =
    companyUser?.company_id ||
    user.company_id ||
    null

  if (!companyId) {
    throw new AppError(403, 'Usuário sem empresa vinculada.')
  }

  return {
    user_id: user.id,
    company_id: companyId,
    scope: 'company',
    role: companyUser?.role || user.role,
    token_version: tv,
  }
}

const login = async (email, password) => {
  const user = await userRepo.findByEmail(email.toLowerCase().trim())

  if (!user) throw new AppError(401, 'Credenciais inválidas')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new AppError(401, 'Credenciais inválidas')

  await userRepo.updateLastLogin(user.id)

  // token_version vem do próprio SELECT * (findByEmail) quando a coluna
  // existe; ausente → 0 (feature inativa).
  const payload = await buildAuthPayload(user, user.token_version ?? 0)

  const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn })

  return {
    user: {
      id:         user.id,
      user_id:    payload.user_id,
      name:       user.name,
      email:      user.email,
      avatar_url: user.avatar_url,
      role:       payload.role,
      scope:      payload.scope,
      company_id: payload.company_id,
    },
    accessToken,
    refreshToken,
  }
}

/**
 * NOTA — GAP CONHECIDO (multi-tenant):
 * O fluxo de auto-registro público ainda não vincula o usuário
 * a nenhuma empresa (company_users). Um usuário criado por aqui
 * não conseguirá logar até receber um vínculo manual via
 * company_users, pois login() exige vínculo ativo para roles
 * não-globais.
 *
 * Este fluxo precisa ser redesenhado: convite por empresa,
 * seleção de empresa no registro, ou desativação do
 * self-registration público em favor de convites administrativos.
 * Não alterado nesta etapa — aguardando decisão de produto.
 */
const register = async (data) => {
  delete data.role

  const email = data.email.toLowerCase().trim()
  const exists = await userRepo.findByEmail(email)
  if (exists) throw new AppError(409, 'E-mail já cadastrado')

  const passwordHash = await bcrypt.hash(data.password, 12)

  try {
    return await userRepo.create({
      name: data.name,
      email,
      passwordHash,
      // 'employee' é o papel base atual da empresa — 'member' era da matriz
      // antiga de roles e não existe mais em authorize()/permissions.js.
      role: 'employee',
      position: data.position,
      phone: data.phone,
      admittedAt: data.admitted_at,
    })
  } catch (err) {
    // A checagem acima é um check-then-insert: entre o findByEmail e o INSERT
    // há uma janela em que outro cadastro do MESMO e-mail pode entrar (duplo
    // clique, duas abas). Quem perde a corrida bate no UNIQUE de users.email e
    // recebia um 500 genérico. Quem garante a unicidade é o banco — aqui só
    // traduzimos a violação para a resposta correta.
    if (err.code === '23505') throw new AppError(409, 'E-mail já cadastrado')
    throw err
  }
}

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret)
    const user = await userRepo.findById(decoded.user_id)

    if (!user) throw new AppError(401, 'Usuário não encontrado')

    // Invalidação de sessão: se a versão do token no banco avançou (reset de
    // senha / logout), o refresh token antigo é recusado. getTokenVersion
    // retorna null quando a coluna não existe → enforcement inativo.
    const currentTv = await userRepo.getTokenVersion(user.id)
    if (currentTv !== null && (decoded.token_version || 0) !== currentTv) {
      throw new AppError(401, 'Sessão expirada. Faça login novamente.')
    }

    const payload = await buildAuthPayload(user, currentTv ?? (decoded.token_version || 0))
    const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    return { accessToken }
  } catch (err) {
    if (err.status) throw err
    throw new AppError(401, 'Refresh token inválido ou expirado')
  }
}

/* ───────────────── Recuperação de senha ───────────────── */

const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email.toLowerCase().trim())

  if (!user) {
    return { message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação em breve.' }
  }

  // Reaproveita o token ainda válido em vez de gerar um novo.
  //
  // Antes, cada pedido sobrescrevia o token anterior. Quem clicasse duas vezes
  // em "Recuperar senha" (ou pedisse de novo achando que o e-mail não chegou)
  // recebia DOIS e-mails e só o mais recente funcionava — ao abrir o primeiro,
  // que costuma estar mais à mão, via "Token inválido ou expirado" sem entender
  // o motivo. Reaproveitando, os dois e-mails levam ao MESMO link e ambos valem.
  //
  // A validade NÃO é estendida: pedir de novo não amplia a janela de 1h do token
  // original, então isso não vira um vetor para manter um link vivo indefinidamente.
  const tokenAindaValido =
    user.reset_token &&
    user.reset_token_expires_at &&
    new Date(user.reset_token_expires_at) > new Date()

  let token
  if (tokenAindaValido) {
    token = user.reset_token
  } else {
    token = crypto.randomBytes(32).toString('hex')
    await userRepo.setResetToken(user.id, token, new Date(Date.now() + 60 * 60 * 1000))
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetLink = `${frontendUrl}/reset-password?token=${token}`

  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetLink,
  })

  return { message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação em breve.' }
}

const resetPassword = async (token, newPassword) => {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    throw new AppError(400, 'Token inválido.')
  }

  const user = await userRepo.findByResetToken(token)
  if (!user) throw new AppError(400, 'Token inválido ou expirado.')

  if (new Date() > new Date(user.reset_token_expires_at)) {
    await userRepo.clearResetToken(user.id)
    throw new AppError(400, 'Token expirado. Solicite uma nova recuperação de senha.')
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError(400, 'A nova senha deve ter no mínimo 8 caracteres.')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await userRepo.updatePassword(user.id, passwordHash)
  await userRepo.clearResetToken(user.id)
  // Invalida qualquer sessão/refresh token ainda ativo com a senha antiga.
  await userRepo.incrementTokenVersion(user.id)

  return { message: 'Senha redefinida com sucesso. Você já pode fazer login.' }
}

/* ───────────────── Logout (todos os dispositivos) ───────────────── */

// Incrementa token_version → os refresh tokens emitidos deixam de renovar
// o acesso. O access token atual continua válido até expirar (≤8h); para
// revogação imediata seria necessário checar token_version a cada request
// (custo de uma query por requisição) — decisão deixada para depois.
const logout = async (userId) => {
  await userRepo.incrementTokenVersion(userId)
  return { message: 'Sessão encerrada.' }
}

module.exports = { login, register, refreshToken, forgotPassword, resetPassword, logout }