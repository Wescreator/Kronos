const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const userRepo  = require('../repositories/user.repository')

const login = async (email, password) => {
  const user = await userRepo.findByEmail(email)
  if (!user) throw { status: 401, message: 'Credenciais inválidas' }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw { status: 401, message: 'Credenciais inválidas' }

  await userRepo.updateLastLogin(user.id)

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role }

  const accessToken  = jwt.sign(payload, jwtConfig.secret,        { expiresIn: jwtConfig.expiresIn })
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn })

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
    accessToken,
    refreshToken
  }
}

const register = async (data) => {
  const exists = await userRepo.findByEmail(data.email)
  if (exists) throw { status: 409, message: 'E-mail já cadastrado' }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await userRepo.create({
    name: data.name, email: data.email, passwordHash,
    role: data.role || 'member', position: data.position, phone: data.phone,
    admittedAt: data.admitted_at
  })

  return user
}

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret)
    const user    = await userRepo.findById(decoded.id)
    if (!user) throw { status: 401, message: 'Usuário não encontrado' }

    const payload     = { id: user.id, name: user.name, email: user.email, role: user.role }
    const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    return { accessToken }
  } catch {
    throw { status: 401, message: 'Refresh token inválido ou expirado' }
  }
}

module.exports = { login, register, refreshToken }