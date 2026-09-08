const { logHttp } = require('../utils/logger')

function httpLogger(req, res, next) {
  const start = Date.now()
  let logged = false
  const write = () => {
    if (logged) return
    logged = true
    logHttp(req, res, Date.now() - start)
  }
  res.on('finish', write)
  res.on('close', write)
  next()
}

module.exports = { httpLogger }
