const bcrypt = require('bcryptjs')
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
async function buildAuthPayload(user) {
  if (GLOBAL_ROLES.includes(user.role)) {
    return {
      user_id:    user.id,
      company_id: null,
      scope:      'global',
      role:       user.role,
    }
  }

  const companyUser = await companyRepo.findActiveCompanyUserByUserId(user.id)

  if (!companyUser) {
    throw { status: 403, message: 'Usuário sem vínculo com nenhuma empresa ativa.' }
  }

  if (!companyUser.company_is_active) {
    throw { status: 403, message: 'Empresa inativa ou suspensa.' }
  }

  return {
    user_id:    user.id,
    company_id: companyUser.company_id,
    scope:      'company',
    role:       companyUser.role,
  }
}

const login = async (email, password) => {
  const user = await userRepo.findByEmail(email.toLowerCase().trim())

  if (!user) throw { status: 401, message: 'Credenciais inválidas' }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw { status: 401, message: 'Credenciais inválidas' }

  await userRepo.updateLastLogin(user.id)

  const payload = await buildAuthPayload(user)

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
  if (exists) throw { status: 409, message: 'E-mail já cadastrado' }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await userRepo.create({
    name: data.name,
    email,
    passwordHash,
    role: 'member',
    position: data.position,
    phone: data.phone,
    admittedAt: data.admitted_at,
  })

  return user
}

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret)
    const user = await userRepo.findById(decoded.user_id)

    if (!user) throw { status: 401, message: 'Usuário não encontrado' }

    const payload = await buildAuthPayload(user)
    const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    return { accessToken }
  } catch (err) {
    if (err.status) throw err
    throw { status: 401, message: 'Refresh token inválido ou expirado' }
  }
}

/* ───────────────── Recuperação de senha ───────────────── */

const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email.toLowerCase().trim())

  if (!user) {
    return { message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação em breve.' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await userRepo.setResetToken(user.id, token, expiresAt)

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
    throw { status: 400, message: 'Token inválido.' }
  }

  const user = await userRepo.findByResetToken(token)
  if (!user) throw { status: 400, message: 'Token inválido ou expirado.' }

  if (new Date() > new Date(user.reset_token_expires_at)) {
    await userRepo.clearResetToken(user.id)
    throw { status: 400, message: 'Token expirado. Solicite uma nova recuperação de senha.' }
  }

  if (!newPassword || newPassword.length < 8) {
    throw { status: 400, message: 'A nova senha deve ter no mínimo 8 caracteres.' }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await userRepo.updatePassword(user.id, passwordHash)
  await userRepo.clearResetToken(user.id)

  return { message: 'Senha redefinida com sucesso. Você já pode fazer login.' }
}

module.exports = { login, register, refreshToken, forgotPassword, resetPassword }