function contactPhone(address, userPhone) {
  return (address?.phone || userPhone || '').trim()
}

const cases = [
  [{ phone: '13800138000' }, '13900000000', '13800138000'],
  [null, '13900000000', '13900000000'],
  [{ phone: '' }, '13900000000', '13900000000'],
  [null, '', '']
]

for (const [address, userPhone, expected] of cases) {
  const got = contactPhone(address, userPhone)
  if (got !== expected) {
    throw new Error(`contactPhone(${JSON.stringify(address)}, ${userPhone}) => ${got}, want ${expected}`)
  }
}

console.log('order contact phone self-check passed')
