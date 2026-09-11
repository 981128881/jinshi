const fs = require("fs")
const p = "G:/supermarket/wxapp-frontend/scripts/compress-icons.mjs"
let s = fs.readFileSync(p, "utf8")
s = s.replace("if (r.includes('/tab/')) return 162", "if (r.startsWith('tab/')) return 162")
s = s.replace("if (r.includes('/icons/order/') || r.includes('/icons/mine/')) return 128", "if (r.includes('icons/order/') || r.includes('icons/mine/')) return 128")
fs.writeFileSync(p, s)
console.log("done")
