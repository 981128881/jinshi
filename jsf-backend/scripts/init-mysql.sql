-- 本机安装 MySQL 后，用 root 登录执行（或 Navicat 运行）
CREATE DATABASE IF NOT EXISTS wxapp_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'wxapp'@'localhost' IDENTIFIED BY 'wxapp123456';
GRANT ALL PRIVILEGES ON wxapp_shop.* TO 'wxapp'@'localhost';

CREATE USER IF NOT EXISTS 'wxapp'@'127.0.0.1' IDENTIFIED BY 'wxapp123456';
GRANT ALL PRIVILEGES ON wxapp_shop.* TO 'wxapp'@'127.0.0.1';

FLUSH PRIVILEGES;
