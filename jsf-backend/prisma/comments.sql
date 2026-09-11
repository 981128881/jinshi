-- 表/字段备注（DataGrip Comment 列）。Prisma /// 不会写入 MySQL。
-- 本文件按当前 schema.prisma 写死列名，线上缺列会报错。
-- 线上请用: node prisma/add-comments.js （缺表/缺列会跳过）

ALTER TABLE `User` COMMENT = '小程序C端用户（微信）';
ALTER TABLE `User` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `User` MODIFY `openid` VARCHAR(64) NOT NULL COMMENT '微信 openid';
ALTER TABLE `User` MODIFY `nickname` VARCHAR(64) NOT NULL DEFAULT '金石菜牌用户' COMMENT '昵称';
ALTER TABLE `User` MODIFY `avatar` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像 URL';
ALTER TABLE `User` MODIFY `phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号';
ALTER TABLE `User` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间';

ALTER TABLE `AdminUser` COMMENT = '管理后台账号（平台超管或门店账号）';
ALTER TABLE `AdminUser` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `AdminUser` MODIFY `username` VARCHAR(64) NOT NULL COMMENT '登录名';
ALTER TABLE `AdminUser` MODIFY `password` VARCHAR(256) NOT NULL COMMENT '密码哈希';
ALTER TABLE `AdminUser` MODIFY `nickname` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '显示名';
ALTER TABLE `AdminUser` MODIFY `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用';
ALTER TABLE `AdminUser` MODIFY `isSuper` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否平台超管';
ALTER TABLE `AdminUser` MODIFY `permissions` JSON NOT NULL DEFAULT ('[]') COMMENT '权限码 JSON 数组';
ALTER TABLE `AdminUser` MODIFY `restaurantId` INT NULL COMMENT '绑定门店，空=平台账号';
ALTER TABLE `AdminUser` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `AdminUser` MODIFY `updatedAt` DATETIME(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `PlatformConfig` COMMENT = '平台级配置（仅一行，id=1）';
ALTER TABLE `PlatformConfig` MODIFY `id` INT NOT NULL COMMENT '固定为 1';
ALTER TABLE `PlatformConfig` MODIFY `name` VARCHAR(128) NOT NULL DEFAULT '金石菜牌齐市店' COMMENT '平台名称';
ALTER TABLE `PlatformConfig` MODIFY `servicePhone` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '客服电话';
ALTER TABLE `PlatformConfig` MODIFY `showBannerSection` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '首页是否显示轮播';
ALTER TABLE `PlatformConfig` MODIFY `showCategorySection` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '首页是否显示品类';
ALTER TABLE `PlatformConfig` MODIFY `showRecommendSection` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '首页是否显示推荐';

ALTER TABLE `Banner` COMMENT = '首页轮播图';
ALTER TABLE `Banner` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `Banner` MODIFY `imageUrl` VARCHAR(512) NOT NULL COMMENT '图片地址';
ALTER TABLE `Banner` MODIFY `title` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '标题';
ALTER TABLE `Banner` MODIFY `link` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '点击跳转';
ALTER TABLE `Banner` MODIFY `sort` INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前';
ALTER TABLE `Banner` MODIFY `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否对小程序展示';

ALTER TABLE `CuisineType` COMMENT = '发现页餐饮品类（川菜/火锅等，不是店内菜单分类）';
ALTER TABLE `CuisineType` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `CuisineType` MODIFY `name` VARCHAR(64) NOT NULL COMMENT '品类名';
ALTER TABLE `CuisineType` MODIFY `icon` VARCHAR(32) NOT NULL DEFAULT '' COMMENT 'emoji 图标';
ALTER TABLE `CuisineType` MODIFY `iconImage` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '图片图标';
ALTER TABLE `CuisineType` MODIFY `sort` INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前';
ALTER TABLE `CuisineType` MODIFY `visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在小程序展示';

ALTER TABLE `Restaurant` COMMENT = '门店';
ALTER TABLE `Restaurant` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `Restaurant` MODIFY `code` VARCHAR(16) NULL COMMENT '对外门店编号（非纯数字）';
ALTER TABLE `Restaurant` MODIFY `name` VARCHAR(128) NOT NULL COMMENT '店名';
ALTER TABLE `Restaurant` MODIFY `logo` VARCHAR(512) NOT NULL DEFAULT '' COMMENT 'Logo';
ALTER TABLE `Restaurant` MODIFY `coverImage` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '封面图';
ALTER TABLE `Restaurant` MODIFY `cuisineTypeId` INT NULL COMMENT '所属平台品类';
ALTER TABLE `Restaurant` MODIFY `phone` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '电话';
ALTER TABLE `Restaurant` MODIFY `address` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '地址';
ALTER TABLE `Restaurant` MODIFY `latitude` DOUBLE NOT NULL DEFAULT 0 COMMENT '纬度';
ALTER TABLE `Restaurant` MODIFY `longitude` DOUBLE NOT NULL DEFAULT 0 COMMENT '经度';
ALTER TABLE `Restaurant` MODIFY `description` TEXT NOT NULL COMMENT '简介';
ALTER TABLE `Restaurant` MODIFY `monthlySales` INT NOT NULL DEFAULT 0 COMMENT '月销量（展示用）';
ALTER TABLE `Restaurant` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'draft草稿 pending待审 approved已上架 rejected驳回 disabled下架';
ALTER TABLE `Restaurant` MODIFY `open` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否营业中';
ALTER TABLE `Restaurant` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `Restaurant` MODIFY `updatedAt` DATETIME(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `RestaurantMember` COMMENT = '门店成员：哪个微信用户是哪家店的店主/店员';
ALTER TABLE `RestaurantMember` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `RestaurantMember` MODIFY `restaurantId` INT NOT NULL COMMENT '门店';
ALTER TABLE `RestaurantMember` MODIFY `userId` INT NOT NULL COMMENT '微信用户';
ALTER TABLE `RestaurantMember` MODIFY `role` VARCHAR(16) NOT NULL DEFAULT 'owner' COMMENT 'owner店主 staff店员';
ALTER TABLE `RestaurantMember` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '加入时间';

ALTER TABLE `OnboardingApplication` COMMENT = '商家入驻申请';
ALTER TABLE `OnboardingApplication` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `OnboardingApplication` MODIFY `userId` INT NOT NULL COMMENT '申请人（微信用户）';
ALTER TABLE `OnboardingApplication` MODIFY `restaurantId` INT NULL COMMENT '通过后关联的门店';
ALTER TABLE `OnboardingApplication` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT 'draft草稿 submitted已提交 reviewing审核中 approved通过 rejected驳回';
ALTER TABLE `OnboardingApplication` MODIFY `contactName` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '联系人';
ALTER TABLE `OnboardingApplication` MODIFY `contactPhone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '联系电话';
ALTER TABLE `OnboardingApplication` MODIFY `legalPerson` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '法人';
ALTER TABLE `OnboardingApplication` MODIFY `licenseNo` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '执照号';
ALTER TABLE `OnboardingApplication` MODIFY `licenseImage` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '执照图片';
ALTER TABLE `OnboardingApplication` MODIFY `restaurantName` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '申请店名';
ALTER TABLE `OnboardingApplication` MODIFY `cuisineTypeId` INT NULL COMMENT '申请品类';
ALTER TABLE `OnboardingApplication` MODIFY `address` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '地址';
ALTER TABLE `OnboardingApplication` MODIFY `latitude` DOUBLE NOT NULL DEFAULT 0 COMMENT '纬度';
ALTER TABLE `OnboardingApplication` MODIFY `longitude` DOUBLE NOT NULL DEFAULT 0 COMMENT '经度';
ALTER TABLE `OnboardingApplication` MODIFY `doorImage` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '门头照';
ALTER TABLE `OnboardingApplication` MODIFY `insideImage` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '店内照';
ALTER TABLE `OnboardingApplication` MODIFY `rejectReason` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '驳回原因';
ALTER TABLE `OnboardingApplication` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `OnboardingApplication` MODIFY `updatedAt` DATETIME(3) NOT NULL COMMENT '更新时间';
ALTER TABLE `OnboardingApplication` MODIFY `submittedAt` DATETIME(3) NULL COMMENT '提交时间';
ALTER TABLE `OnboardingApplication` MODIFY `auditedAt` DATETIME(3) NULL COMMENT '审核时间';

ALTER TABLE `OnboardingAuditLog` COMMENT = '入驻审核操作记录';
ALTER TABLE `OnboardingAuditLog` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `OnboardingAuditLog` MODIFY `applicationId` INT NOT NULL COMMENT '入驻申请';
ALTER TABLE `OnboardingAuditLog` MODIFY `adminId` INT NULL COMMENT '审核人后台账号';
ALTER TABLE `OnboardingAuditLog` MODIFY `adminName` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '审核人显示名';
ALTER TABLE `OnboardingAuditLog` MODIFY `action` VARCHAR(32) NOT NULL COMMENT '动作：通过/驳回等';
ALTER TABLE `OnboardingAuditLog` MODIFY `remark` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '备注/原因';
ALTER TABLE `OnboardingAuditLog` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间';

ALTER TABLE `MenuCategory` COMMENT = '店内菜单分类（热菜/凉菜，不是平台 CuisineType）';
ALTER TABLE `MenuCategory` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `MenuCategory` MODIFY `restaurantId` INT NOT NULL COMMENT '所属门店';
ALTER TABLE `MenuCategory` MODIFY `name` VARCHAR(64) NOT NULL COMMENT '分类名';
ALTER TABLE `MenuCategory` MODIFY `sort` INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前';
ALTER TABLE `MenuCategory` MODIFY `visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否展示';

ALTER TABLE `Dish` COMMENT = '店内菜品';
ALTER TABLE `Dish` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `Dish` MODIFY `restaurantId` INT NOT NULL COMMENT '所属门店';
ALTER TABLE `Dish` MODIFY `categoryId` INT NOT NULL COMMENT '店内分类';
ALTER TABLE `Dish` MODIFY `name` VARCHAR(256) NOT NULL COMMENT '菜名';
ALTER TABLE `Dish` MODIFY `price` DOUBLE NOT NULL COMMENT '价格';
ALTER TABLE `Dish` MODIFY `image` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '图片';
ALTER TABLE `Dish` MODIFY `desc` TEXT NOT NULL COMMENT '简介';
ALTER TABLE `Dish` MODIFY `visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否上架';
ALTER TABLE `Dish` MODIFY `sort` INT NOT NULL DEFAULT 0 COMMENT '排序，越小越前';
ALTER TABLE `Dish` MODIFY `tags` JSON NOT NULL DEFAULT ('[]') COMMENT '标签 JSON 数组';

ALTER TABLE `CartItem` COMMENT = '选菜清单（预约前提交前暂存）';
ALTER TABLE `CartItem` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `CartItem` MODIFY `userId` INT NOT NULL COMMENT '用户';
ALTER TABLE `CartItem` MODIFY `restaurantId` INT NOT NULL COMMENT '门店';
ALTER TABLE `CartItem` MODIFY `dishId` INT NOT NULL COMMENT '菜品';
ALTER TABLE `CartItem` MODIFY `quantity` INT NOT NULL DEFAULT 1 COMMENT '份数';

ALTER TABLE `Order` COMMENT = '到店预约单（无支付、无配送）';
ALTER TABLE `Order` MODIFY `id` VARCHAR(32) NOT NULL COMMENT '预约单号';
ALTER TABLE `Order` MODIFY `userId` INT NOT NULL COMMENT '用户';
ALTER TABLE `Order` MODIFY `restaurantId` INT NOT NULL COMMENT '门店';
ALTER TABLE `Order` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'submitted' COMMENT 'submitted待接单 accepted制作中 ready待取餐 completed已取餐 cancelled已取消';
ALTER TABLE `Order` MODIFY `totalAmount` DOUBLE NOT NULL DEFAULT 0 COMMENT '合计金额';
ALTER TABLE `Order` MODIFY `remark` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '用户备注';
ALTER TABLE `Order` MODIFY `contactName` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '联系人';
ALTER TABLE `Order` MODIFY `contactPhone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '联系电话';
ALTER TABLE `Order` MODIFY `reserveAt` DATETIME(3) NULL COMMENT '预约到店时间';
ALTER TABLE `Order` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '下单时间';
ALTER TABLE `Order` MODIFY `acceptedAt` DATETIME(3) NULL COMMENT '接单时间';
ALTER TABLE `Order` MODIFY `readyAt` DATETIME(3) NULL COMMENT '制作完成时间';
ALTER TABLE `Order` MODIFY `completedAt` DATETIME(3) NULL COMMENT '取餐时间';
ALTER TABLE `Order` MODIFY `cancelledAt` DATETIME(3) NULL COMMENT '取消时间';

ALTER TABLE `OrderItem` COMMENT = '预约单菜品明细（下单快照，改菜单不影响历史）';
ALTER TABLE `OrderItem` MODIFY `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键';
ALTER TABLE `OrderItem` MODIFY `orderId` VARCHAR(32) NOT NULL COMMENT '预约单号';
ALTER TABLE `OrderItem` MODIFY `dishId` INT NULL COMMENT '原菜品，菜删除后可空';
ALTER TABLE `OrderItem` MODIFY `name` VARCHAR(256) NOT NULL COMMENT '下单时菜名';
ALTER TABLE `OrderItem` MODIFY `price` DOUBLE NOT NULL COMMENT '下单时单价';
ALTER TABLE `OrderItem` MODIFY `quantity` INT NOT NULL COMMENT '份数';
ALTER TABLE `OrderItem` MODIFY `image` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '下单时图片';
