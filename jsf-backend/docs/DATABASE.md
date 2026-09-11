# 数据库表说明

库：MySQL，由 `prisma/schema.prisma` 定义。当前业务是 **多餐厅到店预约**（无支付、无配送）。

Prisma 模型名即表名。关系见文末。

表/字段备注（DataGrip Comment）在 `prisma/comments.sql`。Prisma 的 `///` 不会写入 MySQL，改完结构后执行：

```bash
npm run db:comments
```

或在 DataGrip 对当前库跑一遍该 SQL。

## 一览

| 表 | 干什么 |
|---|---|
| `User` | 小程序 C 端用户（微信） |
| `AdminUser` | 管理后台账号（平台运营 / 门店账号） |
| `PlatformConfig` | 平台级开关和客服电话（只有一行） |
| `Banner` | 首页轮播图 |
| `CuisineType` | 发现页餐饮品类（川菜、火锅等） |
| `Restaurant` | 门店 |
| `RestaurantMember` | 哪个微信用户是哪家店的店主/店员 |
| `OnboardingApplication` | 商家入驻申请 |
| `OnboardingAuditLog` | 入驻审核操作记录 |
| `MenuCategory` | 某家店的菜单分类（热菜、凉菜） |
| `Dish` | 某家店的菜品 |
| `CartItem` | 用户预约前的选菜清单 |
| `Order` | 到店预约单 |
| `OrderItem` | 预约单里的菜品明细（下单时快照） |

---

## 用户与账号

### `User`

小程序微信用户。用 `openid` 识别，一微信一号。

挂着：购物车、预约单、入驻申请、门店成员身份。

### `AdminUser`

管理后台登录账号，密码哈希存在 `password`。

- `isSuper = true`：平台超管，看全部店、审入驻
- `restaurantId` 有值：门店账号，只能管这一家
- `permissions`：按钮/菜单权限 JSON

---

## 平台配置与首页

### `PlatformConfig`

整站一份配置（`id` 固定为 1）：店名、客服电话、首页是否显示轮播/品类/推荐。

### `Banner`

首页定位栏下面的轮播。`enabled = true` 才下发给小程序。`sort` 越小越靠前。

### `CuisineType`

发现页横向品类筛选，不是店内菜单分类。`visible = false` 不出现在小程序。

---

## 门店与入驻

### `Restaurant`

一家餐厅。`code` 是对外门店编号（非纯数字）。

`status`：`draft` 草稿 · `pending` 待审 · `approved` 已上架 · `rejected` 驳回 · `disabled` 下架。  
`open`：营业中 / 打烊。小程序只展示 `approved` 且通常还要看 `open`。

### `RestaurantMember`

微信用户和门店的绑定。`role`：`owner` 店主 · `staff` 店员。同一人同一店只能一条。

### `OnboardingApplication`

商家在小程序提交的入驻材料（执照、门头、联系人等）。通过后会生成或挂上 `Restaurant`。

`status`：`draft` · `submitted` · `reviewing` · `approved` · `rejected`。

### `OnboardingAuditLog`

谁在什么时候通过/驳回了哪条入驻申请，`remark` 里是原因。

---

## 菜单

### `MenuCategory`

**某一家店内部**的菜单分类，跟平台 `CuisineType` 不是一张表。随店删除（级联）。

### `Dish`

某一家店的一道菜：价格、图、简介、标签、是否上架。`visible = false` 小程序不展示。

---

## 预约

### `CartItem`

用户点「选菜」后、提交预约前的暂存。一人一道菜一条，用 `quantity` 计份数。

### `Order`

到店预约单，主键是字符串单号，不是自增数字。

没有支付、没有配送地址。`reserveAt` 是预约到店时间。

`status`：

| 值 | 含义 |
|---|---|
| `submitted` | 已提交，待接单 |
| `accepted` | 已接单，制作中 |
| `ready` | 制作完成，待取餐 |
| `completed` | 已取餐 |
| `cancelled` | 已取消 |

### `OrderItem`

预约单明细。名称、价格、图片在下单时拷贝一份，之后改菜谱不影响历史单。`dishId` 可空（菜被删了仍留着明细）。

---

## 表怎么连

```
User
 ├─ CartItem ── Dish ── MenuCategory ── Restaurant
 ├─ Order ──── OrderItem ── Dish
 ├─ RestaurantMember ── Restaurant
 └─ OnboardingApplication ── Restaurant
                          └── OnboardingAuditLog

CuisineType ── Restaurant
AdminUser ── Restaurant（仅门店账号）
PlatformConfig、Banner：独立，不挂外键
```

改表结构只改 `prisma/schema.prisma`，然后 `npx prisma db push`。
