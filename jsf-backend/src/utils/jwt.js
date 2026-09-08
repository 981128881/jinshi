const jwt = require('jsonwebtoken')
const config = require('../config')

function signToken(payload, expiresIn) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn || config.jwtExpiresIn
  })
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret)
}

module.exports = { signToken, verifyToken }
