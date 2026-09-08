function success(res, data, message = 'ok') {
  return res.json({ code: 0, message, data })
}

function fail(res, code, message, status = 200) {
  return res.status(status).json({ code, message, data: null })
}

module.exports = { success, fail }
