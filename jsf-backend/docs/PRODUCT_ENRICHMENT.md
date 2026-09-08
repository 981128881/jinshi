# 商品主图 enrichment（无淘宝 AppKey 方案）

## 方案对比

| 优先级 | 方案 | 成本 | 国内命中率 |
|--------|------|------|------------|
| 1 | POS 本地图片 | 免费 | 看门店是否拍过 |
| 2 | 极数本源 apizero.cn | 免费 20~200/天 | 较高 |
| 3 | UPC Item DB | 免费 100/天 | 低~中 |
| 4 | 极速数据 jisuapi.com | 注册送 100 次 | 较高 |
| 5 | 京东 Playwright | 免费 | 中（按名称） |
| 6 | 探数/万维易源 ShowAPI | ~0.01 元/次 | 高 |

---

## 大牌优先（推荐先做）

可口可乐、百事、农夫山泉等国民品牌，名称搜图命中率高：

```bat
cd /d G:\supermarket\wxapp-backend

:: 0. 确保 MySQL 已启动（docker compose up -d）

:: 1. 下载各品牌通用主图（每品牌 1 张）
npm run enrich:brands:stock

:: 2. 统计各品牌无图数量
npm run enrich:brands:list

:: 3. 自动补图（京东 HTML 搜图 + 品牌通用图兜底）
npm run enrich:brands:auto

:: 或一键 bat
G:\supermarket\AiBaoPOS\sync\run_enrich_brands.bat
```

补图顺序：`POS本地图 → 条码API → 京东HTML搜图 → 品牌通用图(同品牌共用)`

脚本: `prisma/enrich-brand-images.js`，词表: `prisma/lib/brand-keywords.js`

---

## 一键多源（全库）

```bat
cd /d G:\supermarket\wxapp-backend
```

:: 试跑
node prisma/enrich-product-images.js --limit=20 --dry-run

:: 正式
npm run enrich:images -- --limit=500

:: 补剩余 + 京东
npm run enrich:images:jd -- --limit=200 --headed
```

`.env` 可选：

```env
APIZERO_API_KEY=    # https://apizero.cn
JISU_API_KEY=       # https://www.jisuapi.com 送100次
```

---

## 付费批量（1.7 万条）

- 探数 tanshuapi.com — 试用 + 按量
- 万维易源 showapi.com — 条码含图片
- 顶想 topthink.com — 融合中国条码中心

约 0.01~0.02 元/条 → 全库 ~175~350 元

---

## 其他

- Open Food Facts: `npm run fetch:images:food`（食品补充）
- 淘宝 API: `npm run enrich:taobao`（需 AppKey）
- 脚本: `prisma/enrich-product-images.js`
