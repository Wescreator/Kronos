const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const jwtConfig = require('../config/jwt')
const userRepo = require('../repositories/user.repository')
const emailService = require('./email.service')

function buildJwtPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,

    // Preparação para arquitetura Multi-Tenant.
    // Permanecerá undefined enquanto o backend não começar
    // a popular este campo.
    company_id: user.company_id ?? null
  }
}

const login = async (email, password) => {
  const user = await userRepo.findByEmail(email.toLowerCase().trim())

  if (!user)
    throw { status: 401, message: 'Credenciais inválidas' }

  const valid = await bcrypt.compare(password, user.password_hash)

  if (!valid)
    throw { status: 401, message: 'Credenciais inválidas' }

  await userRepo.updateLastLogin(user.id)

  const payload = buildJwtPayload(user)

  const accessToken = jwt.sign(
    payload,
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  )

  const refreshToken = jwt.sign(
    payload,
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  )

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      company_id: user.company_id ?? null
    },
    accessToken,
    refreshToken
  }
}

const register = async (data) => {
  delete data.role

  const email = data.email.toLowerCase().trim()

  const exists = await userRepo.findByEmail(email)

  if (exists)
    throw {
      status: 409,
      message: 'E-mail já cadastrado'
    }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await userRepo.create({
    name: data.name,
    email,
    passwordHash,
    role: 'member',
    position: data.position,
    phone: data.phone,
    admittedAt: data.admitted_at
  })

  return user
}

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret)

    const user = await userRepo.findById(decoded.id)

    if (!user)
      throw {
        status: 401,
        message: 'Usuário não encontrado'
      }

    const payload = buildJwtPayload(user)

    const accessToken = jwt.sign(
      payload,
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    )

    return { accessToken }

  } catch {
    throw {
      status: 401,
      message: 'Refresh token inválido ou expirado'
    }
  }
}

/* ───────────────── Recuperação de senha ───────────────── */

const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(
    email.toLowerCase().trim()
  )

  if (!user) {
    return {
      message:
        'Se o email estiver cadastrado, você receberá as instruções de recuperação em breve.'
    }
  }

  const token = crypto.randomBytes(32).toString('hex')

  const expiresAt = new Date(
    Date.now() + 60 * 60 * 1000
  )

  await userRepo.setResetToken(
    user.id,
    token,
    expiresAt
  )

  const frontendUrl =
    process.env.FRONTEND_URL ||
    'http://localhost:5173'

  const resetLink =
    `${frontendUrl}/reset-password?token=${token}`

  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetLink
  })

  return {
    message:
      'Se o email estiver cadastrado, você receberá as instruções de recuperação em breve.'
  }
}

const resetPassword = async (token, newPassword) => {
  if (
    !token ||
    typeof token !== 'string' ||
    token.length !== 64
  ) {
    throw {
      status: 400,
      message: 'Token inválido.'
    }
  }

  const user = await userRepo.findByResetToken(token)

  if (!user) {
    throw {
      status: 400,
      message: 'Token inválido ou expirado.'
    }
  }

  if (
    new Date() >
    new Date(user.reset_token_expires_at)
  ) {
    await userRepo.clearResetToken(user.id)

    throw {
      status: 400,
      message:
        'Token expirado. Solicite uma nova recuperação de senha.'
    }
  }

  if (!newPassword || newPassword.length < 8) {
    throw {
      status: 400,
      message:
        'A nova senha deve ter no mínimo 8 caracteres.'
    }
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    12
  )

  await userRepo.updatePassword(
    user.id,
    passwordHash
  )

  await userRepo.clearResetToken(user.id)

  return {
    message:
      'Senha redefinida com sucesso. Você já pode fazer login.'
  }
}

module.exports = {login, register, refreshToken, forgotPassword, resetPassword
}