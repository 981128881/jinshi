/**
 * 按商品名称/描述关键词，将 POS 导入的商品归入小程序标准分类
 * 用法: node prisma/classify-products.js
 */
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const { invalidateCategories } = require('../src/services/shop')
const { invalidateProductCount } = require('../src/services/statsCache')

const prisma = new PrismaClient()
const OUT = 'G:/supermarket/AiBaoPOS/sync/classify_report.txt'

/** 语义分类 key -> 数据库 Category.name 候选 */
const STD_NAME_ALIASES = {
  水果: ['水果'],
  蔬菜: ['蔬菜'],
  肉禽蛋: ['肉禽蛋', '蛋类', '肉蛋'],
  海鲜: ['海鲜', '水产'],
  乳品: ['乳品', '乳制品', '奶品'],
  饮料: ['饮料', '饮品'],
  零食: ['零食', '休闲食品'],
  粮油: ['粮油', '米面油'],
  日用: ['日用', '百货', '生活用品'],
  酒水: ['酒水', '酒', '酒类']
}

const CATEGORY_RULES = [
  { key: '酒水', words: ['酒', '红酒', '白酒', '啤酒', '干红', '干白', '葡萄酒', '威士忌', '伏特加', '朗姆', '梅酒', '补酒', '黄酒', '米酒', '清酒', '香槟', '鸡尾酒', '预调酒', '江小白', '二锅头', '茅台', '五粮液', '泸州', '洋河', '剑南春', '汾酒', '劲酒', 'RIO', '锐澳'] },
  { key: '饮料', words: ['可乐', '汽水', '果汁', '茶饮', '咖啡', '饮料', '矿泉', '百事', '雪碧', '美年达', '脉动', '芬达', '冰茶', '奶茶', '豆奶', '苏打', '功能饮', '运动饮', '王老吉', '加多宝', '红牛', '东鹏', '佳得乐', '茶π', '茶派', '东方树叶', '统一', '康师傅', '冰红茶', '绿茶', '乌龙茶', '星巴克', '拿铁', '卡布奇诺', '摩卡', '阿萨姆', '营养快线', '爽歪歪', 'AD钙', '维他', '椰汁', '椰奶', '乳酸菌', '益力多', '养乐多', '苏打水', '气泡水'] },
  { key: '零食', words: ['饼干', '薯片', '糖果', '巧克力', '零食', '奥利奥', '奥力奥', '坚果', '方便面', '小当家', '脆脆面', '果卷', '软糖', '锅巴', '膨化', '瓜子', '花生', '腰果', '开心果', '碧根果', '夏威夷果', '巴旦木', '杏仁', '话梅', '蜜饯', '果脯', '牛肉干', '凤爪', '鸭脖', '辣条', '卫龙', '好丽友', '乐事', '品客', '旺旺', '仙贝', '雪饼', '米饼', '蛋卷', '威化', '曲奇', '沙琪玛', '蛋黄派', '士力架', '德芙', '费列罗', '金丝猴', '大白兔', '阿尔卑斯', '棒棒糖', '口香糖', '能量棒', '夹心'] },
  { key: '粮油', words: ['大米', '小米', '面粉', '挂面', '面条', '酱油', '醋', '味精', '鸡精', '盐', '芝麻', '调和油', '食用油', '火锅底料', '调味', '香醋', '老抽', '生抽', '橄榄油', '糯米', '杂粮', '八宝粥', '罐头', '粉丝', '粉条', '淀粉', '酵母', '烘焙', '白糖', '红糖', '冰糖', '蜂蜜', '果酱', '花生酱', '沙拉酱', '番茄酱', '蚝油', '料酒', '花椒', '八角', '桂皮', '香料', '干货', '腐竹', '豆皮', '豆腐皮', '河粉', '米粉', '燕麦', '麦片', '玉米面', '玉米油', '菜籽油', '花生油', '葵花籽油', '色拉油'] },
  { key: '乳品', words: ['牛奶', '酸奶', '奶酪', '乳酪', '纯奶', '鲜乳', '伊利', '蒙牛', '光明', '特仑苏', '安慕希', '金典', '纯甄', '旺仔', '钙奶', '鲜奶', '炼乳', '黄油', '奶油', '芝士', '车达', '乳饮料', '优酸乳', '酸酸乳'] },
  { key: '海鲜', words: ['虾', '鱼', '蟹', '海鲜', '三文鱼', '基围虾', '带鱼', '鱿鱼', '海参', '鲍鱼', '扇贝', '虾仁', '墨鱼', '章鱼', '花甲', '蛤蜊', '生蚝', '牡蛎', '鳕鱼', '黄鱼', '鲳鱼', '鲈鱼', '桂鱼', '鳗鱼', '金枪鱼', '鱼丸', '虾滑', '蟹棒', '鱼豆腐', '海苔', '紫菜', '海带', '裙带菜'] },
  { key: '肉禽蛋', words: ['猪肉', '牛肉', '羊肉', '鸡肉', '鸡翅', '鸡腿', '排骨', '里脊', '火腿', '香肠', '培根', '鸡蛋', '鸭蛋', '鹅蛋', '鹌鹑蛋', '咸蛋', '皮蛋', '肉丸', '肉肠', '双汇', '金锣', '雨润', '腊肉', '腊肠', '咸肉', '熏肉', '扒鸡', '烧鸡', '整鸡', '鸡胸', '鸭', '鹅', '鸽子', '鹌鹑', '牛排', '牛腩', '牛腱', '羊排', '猪蹄', '猪手', '猪肝', '猪肚'] },
  { key: '蔬菜', words: ['蔬菜', '西兰花', '白菜', '土豆', '番茄', '西红柿', '黄瓜', '青菜', '菠菜', '芹菜', '萝卜', '胡萝卜', '洋葱', '大蒜', '生姜', '辣椒', '蘑菇', '平菇', '金针菇', '杏鲍菇', '香菇', '木耳', '茄子', '豆角', '四季豆', '荷兰豆', '豌豆', '南瓜', '冬瓜', '丝瓜', '苦瓜', '莲藕', '山药', '芋头', '红薯', '紫薯', '竹笋', '芦笋', '生菜', '油麦', '空心菜', '茼蒿', '韭菜', '大葱', '小葱', '蒜苔', '菜花', '花菜', '包菜', '卷心菜', '娃娃菜', '芥蓝', '油菜', '香菜', '芫荽', '菌类', '菌菇'] },
  { key: '水果', words: ['水果', '苹果', '橙', '桃', '梨', '葡萄', '芒果', '草莓', '香蕉', '猕猴桃', '车厘子', '樱桃', '柠檬', '杨梅', '黄桃', '脐橙', '哈密瓜', '西瓜', '蜜瓜', '甜瓜', '火龙果', '榴莲', '山竹', '荔枝', '龙眼', '桂圆', '菠萝', '凤梨', '柚子', '蜜柚', '文旦', '石榴', '柿子', '枣', '大枣', '青枣', '冬枣', '李子', '杏', '枇杷', '蓝莓', '黑莓', '树莓', '桑葚', '无花果', '牛油果', '鳄梨', '芭乐', '番石榴', '莲雾', '释迦', '百香果', '西柚', '金桔', '砂糖橘', '丑橘', '沃柑', '粑粑柑', '春见', '爱媛', '果冻橙', '提子', '青提', '红提', '阳光玫瑰', '巨峰', '玫瑰香', '崂勒'] },
  { key: '日用', words: ['洗发', '沐浴', '肥皂', '香皂', '牙膏', '牙刷', '纸巾', '抽纸', '卷纸', '洗衣', '洗洁精', '洗衣液', '衣架', '脸盆', '筷', '针线', '杀虫', '蚊香', '花露水', '舒蕾', '拉芳', '六神', '纸杯', '杯', '碗', '盆', '梳', '扫把', '拖把', '手套', '口罩', '日用', '毛巾', '浴巾', '拖鞋', '垃圾袋', '保鲜', '保鲜膜', '锡纸', '电池', '充电', '插座', '开关', '灯泡', '胶带', '剪刀', '刀', '钳', '螺丝', '挂钩', '夹子', '裤夹', '窗帘', '围裙', '洗盒', '打火机', '剃须', '吉列', '刮胡', '棉签', '湿巾', '卫生', '护垫', '卫生巾', '纸尿裤', '尿不湿', '奶粉', '奶瓶', '奶嘴', '玩具', '文具', '笔', '本', '橡皮', '尺子', '锅', '铲', '勺', '碟', '盘', '壶', '紫砂', '绞蒜', '捣臼', '胶棉', '簸箕', '水桶', '收纳', '整理', '置物', '粘钩', '雨伞', '雨具', '袜', '帽', '伞', '无码商品', '店内商品'] }
]

async function buildCategoryIdMap() {
  const rows = await prisma.category.findMany({
    where: { externalId: null },
    select: { id: true, name: true }
  })
  const map = {}
  for (const [key, aliases] of Object.entries(STD_NAME_ALIASES)) {
    const hit = rows.find((r) => aliases.some((a) => r.name.includes(a) || a.includes(r.name)))
    if (hit) map[key] = hit.id
  }
  // fallback: 按名称精确匹配全部 Category（含可能被误标的标准分类）
  const all = await prisma.category.findMany({ select: { id: true, name: true, externalId: true } })
  for (const [key, aliases] of Object.entries(STD_NAME_ALIASES)) {
    if (map[key]) continue
    const hit = all.find((r) => aliases.includes(r.name))
    if (hit) map[key] = hit.id
  }
  if (!map.日用) {
    const daily = all.find((r) => r.name === '日用')
    if (daily) map.日用 = daily.id
  }
  return map
}

function classifyText(text, keyToId) {
  const s = String(text || '')
  if (!s.trim()) return keyToId.日用
  for (const rule of CATEGORY_RULES) {
    for (const w of rule.words) {
      if (s.includes(w)) return keyToId[rule.key] || keyToId.日用
    }
  }
  return keyToId.日用
}

function classifyProduct(p, keyToId) {
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : ''
  const text = [p.name, p.desc, tags].filter(Boolean).join(' ')
  return classifyText(text, keyToId)
}

async function main() {
  const lines = []
  const log = (msg) => { lines.push(msg); console.log(msg) }

  log('=== 商品按属性自动分类 ===')
  log(new Date().toISOString())

  const keyToId = await buildCategoryIdMap()
  log('分类 ID 映射:')
  for (const [k, id] of Object.entries(keyToId)) {
    const row = await prisma.category.findUnique({ where: { id } })
    log(`  ${k} -> id=${id} (${row?.name || '?'})`)
  }

  const defaultId = keyToId.日用
  if (!defaultId) throw new Error('未找到默认分类「日用」')

  const products = await prisma.product.findMany({
    select: { id: true, name: true, desc: true, tags: true, categoryId: true }
  })
  log(`待分类商品: ${products.length}`)

  const stats = {}
  for (const k of Object.keys(keyToId)) stats[k] = 0

  const BATCH = 200
  let updated = 0
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const ops = []
    for (const p of batch) {
      const newCatId = classifyProduct(p, keyToId)
      const key = Object.entries(keyToId).find(([, id]) => id === newCatId)?.[0] || '日用'
      stats[key] = (stats[key] || 0) + 1
      if (p.categoryId !== newCatId) {
        updated += 1
        ops.push(prisma.product.update({
          where: { id: p.id },
          data: { categoryId: newCatId }
        }))
      }
    }
    if (ops.length) await prisma.$transaction(ops)
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= products.length) {
      log(`进度: ${Math.min(i + BATCH, products.length)}/${products.length}`)
    }
  }

  log('\n--- 分类统计 ---')
  for (const [key, id] of Object.entries(keyToId)) {
    log(`${key} (id=${id}): ${stats[key] || 0}`)
  }
  log(`\n已更新 categoryId: ${updated}`)

  const posCats = await prisma.category.findMany({ where: { externalId: { not: null } } })
  let removedCats = 0
  for (const c of posCats) {
    const cnt = await prisma.product.count({ where: { categoryId: c.id } })
    if (cnt === 0) {
      await prisma.category.delete({ where: { id: c.id } })
      removedCats += 1
      log(`删除空 POS 分类: ${c.name} (id=${c.id})`)
    }
  }
  log(`清理 POS 空分类: ${removedCats}`)

  await invalidateCategories()
  invalidateProductCount()

  log('\n--- 抽样 ---')
  for (const [key, id] of Object.entries(keyToId)) {
    const samples = await prisma.product.findMany({
      where: { categoryId: id },
      take: 3,
      select: { name: true, price: true }
    })
    log(`${key}: ${samples.map((s) => s.name).join(' | ') || '(无)'}`)
  }

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
  log(`\n报告: ${OUT}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
