const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.platformConfig.update({ where: { id: 1 }, data: { name: "金石菜牌齐市店" } }).then((r) => { console.log("OK", JSON.stringify(r)); return p.$disconnect(); }).catch((e) => { console.error("ERR", e.message); return p.$disconnect().then(() => process.exit(1)); });
