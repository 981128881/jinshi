const fs = require('fs')
const path = require('path')
const config = require('../config')

let client = null

function isPayConfigured() {
  const { mchId, apiV3Key, certSerialNo, notifyUrl } = config.pay
  const hasKey = config.pay.privateKey || (config.pay.privateKeyPath && fs.existsSync(config.pay.privateKeyPath))
  return !!(mchId && apiV3Key && certSerialNo && notifyUrl && hasKey && config.wx.appId)
}

function loadPrivateKey() {
  if (config.pay.privateKey) {
    return config.pay.privateKey.replace(/\\n/g, '\n')
  }
  if (config.pay.privateKeyPath) {
    const p = path.isAbsolute(config.pay.privateKeyPath)
      ? config.pay.privateKeyPath
      : path.join(process.cwd(), config.pay.privateKeyPath)
    return fs.readFileSync(p, 'utf8')
  }
  throw new Error('未配置微信支付商户私钥')
}

function loadMerchantCert() {
  if (config.pay.merchantCert) {
    return config.pay.merchantCert.replace(/\\n/g, '\n')
  }
  if (config.pay.merchantCertPath) {
    const p = path.isAbsolute(config.pay.merchantCertPath)
      ? config.pay.merchantCertPath
      : path.join(process.cwd(), config.pay.merchantCertPath)
    return fs.readFileSync(p, 'utf8')
  }
  return loadPrivateKey()
}

function getClient() {
  if (client) return client
  if (!isPayConfigured()) {
    throw new Error('微信支付未配置完整')
  }

  const WxPay = require('wechatpay-node-v3')
  const privateKey = loadPrivateKey()
  const publicKey = loadMerchantCert()

  client = new WxPay({
    appid: config.wx.appId,
    mchid: config.pay.mchId,
    publicKey,
    privateKey,
    key: config.pay.apiV3Key,
    serial_no: config.pay.certSerialNo
  })
  return client
}

/**
 * 小程序 JSAPI 统一下单，返回调起支付参数
 */
async function createJsapiPrepay({ outTradeNo, description, totalFen, openid }) {
  const pay = getClient()
  const result = await pay.transactions_jsapi({
    description: description.slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: config.pay.notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
    payer: { openid }
  })

  const prepayId = result?.data?.prepay_id
  if (!prepayId) {
    throw new Error('微信下单失败：未返回 prepay_id')
  }

  const appId = config.wx.appId
  const timeStamp = String(Math.floor(Date.now() / 1000))
  const nonceStr = Math.random().toString(36).slice(2, 18)
  const packageStr = `prepay_id=${prepayId}`
  const paySign = pay.getPaySign({
    appId,
    timeStamp,
    nonceStr,
    package: packageStr
  })

  return {
    prepayId,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign
  }
}

/** 关闭微信侧订单 */
async function closeWechatOrder(outTradeNo) {
  const pay = getClient()
  await pay.close(outTradeNo)
}

/** 发起退款 */
async function createRefund({ outTradeNo, outRefundNo, reason, totalFen, refundFen, notifyUrl }) {
  const pay = getClient()
  const params = {
    out_trade_no: outTradeNo,
    out_refund_no: outRefundNo,
    reason: (reason || '商家退款').slice(0, 80),
    amount: {
      refund: refundFen,
      total: totalFen,
      currency: 'CNY'
    }
  }
  if (notifyUrl) params.notify_url = notifyUrl

  const result = await pay.refunds(params)
  return result?.data
}

/**
 * 验证回调签名并解密 resource
 * @returns {object} 解密后的支付结果
 */
async function verifyAndDecryptNotify(rawBody, headers) {
  const pay = getClient()
  const timestamp = headers['wechatpay-timestamp']
  const nonce = headers['wechatpay-nonce']
  const serial = headers['wechatpay-serial']
  const signature = headers['wechatpay-signature']

  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)

  const valid = await pay.verifySign({
    timestamp,
    nonce,
    body: bodyStr,
    serial,
    signature
  })
  if (!valid) {
    throw new Error('微信支付回调验签失败')
  }

  const { resource } = JSON.parse(bodyStr)
  const decrypted = pay.decipher_gcm(
    resource.ciphertext,
    resource.associated_data,
    resource.nonce
  )
  return JSON.parse(decrypted)
}

module.exports = {
  isPayConfigured,
  createJsapiPrepay,
  closeWechatOrder,
  createRefund,
  verifyAndDecryptNotify
}
