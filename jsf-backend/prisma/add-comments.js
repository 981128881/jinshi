/**
 * 按当前库实际列加 MySQL COMMENT（缺表/缺列跳过，不改类型）。
 *   node prisma/add-comments.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const COMMENTS = {
  User: {
    _table: '小程序C端用户（微信）',
    id: '主键',
    openid: '微信 openid',
    nickname: '昵称',
    avatar: '头像 URL',
    phone: '手机号',
    createdAt: '注册时间'
  },
  AdminUser: {
    _table: '管理后台账号（平台超管或门店账号）',
    id: '主键',
    username: '登录名',
    password: '密码哈希',
    nickname: '显示名',
    enabled: '是否启用',
    isSuper: '是否平台超管',
    permissions: '权限码 JSON 数组',
    restaurantId: '绑定门店，空=平台账号',
    createdAt: '创建时间',
    updatedAt: '更新时间'
  },
  PlatformConfig: {
    _table: '平台级配置（仅一行，id=1）',
    id: '固定为 1',
    name: '平台名称',
    servicePhone: '客服电话',
    showBannerSection: '首页是否显示轮播',
    showCategorySection: '首页是否显示品类',
    showRecommendSection: '首页是否显示推荐'
  },
  Banner: {
    _table: '首页轮播图',
    id: '主键',
    imageUrl: '图片地址',
    title: '标题',
    link: '点击跳转',
    sort: '排序，越小越前',
    enabled: '是否对小程序展示'
  },
  CuisineType: {
    _table: '发现页餐饮品类（川菜/火锅等，不是店内菜单分类）',
    id: '主键',
    name: '品类名',
    icon: 'emoji 图标',
    iconImage: '图片图标',
    sort: '排序，越小越前',
    visible: '是否在小程序展示'
  },
  Restaurant: {
    _table: '门店',
    id: '主键',
    code: '对外门店编号（非纯数字）',
    name: '店名',
    logo: 'Logo',
    coverImage: '封面图',
    cuisineTypeId: '所属平台品类',
    phone: '电话',
    address: '地址',
    latitude: '纬度',
    longitude: '经度',
    description: '简介',
    monthlySales: '月销量（展示用）',
    status: 'draft草稿 pending待审 approved已上架 rejected驳回 disabled下架',
    open: '是否营业中',
    createdAt: '创建时间',
    updatedAt: '更新时间'
  },
  RestaurantMember: {
    _table: '门店成员：哪个微信用户是哪家店的店主/店员',
    id: '主键',
    restaurantId: '门店',
    userId: '微信用户',
    role: 'owner店主 staff店员',
    createdAt: '加入时间'
  },
  OnboardingApplication: {
    _table: '商家入驻申请',
    id: '主键',
    userId: '申请人（微信用户）',
    restaurantId: '通过后关联的门店',
    status: 'draft草稿 submitted已提交 reviewing审核中 approved通过 rejected驳回',
    contactName: '联系人',
    contactPhone: '联系电话',
    legalPerson: '法人',
    licenseNo: '执照号',
    licenseImage: '执照图片',
    restaurantName: '申请店名',
    cuisineTypeId: '申请品类',
    address: '地址',
    latitude: '纬度',
    longitude: '经度',
    doorImage: '门头照',
    insideImage: '店内照',
    rejectReason: '驳回原因',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    submittedAt: '提交时间',
    auditedAt: '审核时间'
  },
  OnboardingAuditLog: {
    _table: '入驻审核操作记录',
    id: '主键',
    applicationId: '入驻申请',
    adminId: '审核人后台账号',
    adminName: '审核人显示名',
    action: '动作：通过/驳回等',
    remark: '备注/原因',
    createdAt: '操作时间'
  },
  MenuCategory: {
    _table: '店内菜单分类（热菜/凉菜，不是平台 CuisineType）',
    id: '主键',
    restaurantId: '所属门店',
    name: '分类名',
    sort: '排序，越小越前',
    visible: '是否展示'
  },
  Dish: {
    _table: '店内菜品',
    id: '主键',
    restaurantId: '所属门店',
    categoryId: '店内分类',
    name: '菜名',
    price: '价格',
    image: '图片',
    desc: '简介',
    visible: '是否上架',
    sort: '排序，越小越前',
    tags: '标签 JSON 数组'
  },
  CartItem: {
    _table: '选菜清单（预约前提交前暂存）',
    id: '主键',
    userId: '用户',
    restaurantId: '门店',
    dishId: '菜品',
    quantity: '份数'
  },
  Order: {
    _table: '到店预约单（无支付、无配送）',
    id: '预约单号',
    userId: '用户',
    restaurantId: '门店',
    status: 'submitted待接单 accepted制作中 ready待取餐 completed已取餐 cancelled已取消',
    totalAmount: '合计金额',
    remark: '用户备注',
    contactName: '联系人',
    contactPhone: '联系电话',
    reserveAt: '预约到店时间',
    createdAt: '下单时间',
    acceptedAt: '接单时间',
    readyAt: '制作完成时间',
    completedAt: '取餐时间',
    cancelledAt: '取消时间'
  },
  OrderItem: {
    _table: '预约单菜品明细（下单快照，改菜单不影响历史）',
    id: '主键',
    orderId: '预约单号',
    dishId: '原菜品，菜删除后可空',
    name: '下单时菜名',
    price: '下单时单价',
    quantity: '份数',
    image: '下单时图片'
  }
}

function q(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function defaultSql(col) {
  const d = col.COLUMN_DEFAULT
  if (d == null) return ''
  const str = String(d)
  const type = String(col.COLUMN_TYPE || '')
  const extra = String(col.EXTRA || '')
  if (/current_timestamp/i.test(str)) return ` DEFAULT ${str}`
  if (type === 'json' || extra.includes('DEFAULT_GENERATED')) {
    if (/^\(/.test(str)) return ` DEFAULT ${str}`
    return ` DEFAULT (${JSON.stringify(str)})`
  }
  if (/^(tinyint|smallint|mediumint|int|bigint|float|double|decimal)/.test(type)) {
    return ` DEFAULT ${str}`
  }
  return ` DEFAULT '${q(str)}'`
}

function extraSql(col) {
  const extra = String(col.EXTRA || '')
  let s = ''
  if (/auto_increment/i.test(extra)) s += ' AUTO_INCREMENT'
  const onUp = extra.match(/on update .+/i)
  if (onUp) s += ` ${onUp[0]}`
  return s
}

function modifySql(table, col, comment) {
  const nullSql = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'
  return `ALTER TABLE \`${table}\` MODIFY \`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE} ${nullSql}${defaultSql(col)}${extraSql(col)} COMMENT '${q(comment)}'`
}

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
  `)
  const actual = new Map(tables.map((t) => [String(t.TABLE_NAME).toLowerCase(), t.TABLE_NAME]))
  let applied = 0
  const skipped = []

  for (const [model, fields] of Object.entries(COMMENTS)) {
    const table = actual.get(model.toLowerCase())
    if (!table) {
      skipped.push(model)
      continue
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` COMMENT = '${q(fields._table)}'`)
    applied++

    const cols = await prisma.$queryRawUnsafe(
      `
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, DATA_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `,
      table
    )
    const colMap = new Map(cols.map((c) => [c.COLUMN_NAME, c]))
    for (const [name, comment] of Object.entries(fields)) {
      if (name === '_table') continue
      const col = colMap.get(name)
      if (!col) {
        skipped.push(`${table}.${name}`)
        continue
      }
      await prisma.$executeRawUnsafe(modifySql(table, col, comment))
      applied++
    }
  }
  console.log(`ok ${applied} comments`)
  if (skipped.length) console.log('skip (库里没有)', skipped.join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
