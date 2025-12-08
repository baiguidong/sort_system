-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户表
-- ----------------------------
DROP TABLE IF EXISTS `cc_user`;
CREATE TABLE `cc_user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '用户名',
  `pwd` VARCHAR(255) NOT NULL COMMENT '密码',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- 区域表
-- ----------------------------
DROP TABLE IF EXISTS `cc_product_area`;
CREATE TABLE `cc_product_area` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '区域名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '区域描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区域表';

-- ----------------------------
-- 商品表
-- ----------------------------
DROP TABLE IF EXISTS `cc_product`;
CREATE TABLE `cc_product` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `area_id` INT DEFAULT NULL COMMENT '区域ID',
  `photo` VARCHAR(500) DEFAULT NULL COMMENT '照片URL',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT '客户名',
  `size` VARCHAR(50) DEFAULT NULL COMMENT '尺码',
  `quantity` INT DEFAULT 0 COMMENT '件数（自动从尺码解析）',
  `address` TEXT DEFAULT NULL COMMENT '收件地址',
  `status_note_photo` VARCHAR(500) DEFAULT NULL COMMENT '货物状态备注图片',
  `cost_eur` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本欧元',
  `exchange_rate` DECIMAL(10,4) DEFAULT 0.0000 COMMENT '结账汇率',
  `cost_rmb` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本RMB（自动计算）',
  `price_rmb` DECIMAL(10,2) DEFAULT 0.00 COMMENT '售价RMB',
  `shipping_fee` DECIMAL(10,2) DEFAULT 0.00 COMMENT '国际运费与清关费',
  `total_cost` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总成本（自动计算）',
  `profit` DECIMAL(10,2) DEFAULT 0.00 COMMENT '净利润（自动计算）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_area_id` (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- ----------------------------
-- 插入初始数据
-- ----------------------------
-- 默认用户 (密码: 123456, test123)
INSERT INTO `cc_user` (`name`, `pwd`) VALUES
('admin', '123456'),
('test', 'test123');

-- 示例区域数据（可选）
INSERT INTO `cc_product_area` (`user_id`, `name`, `description`) VALUES
(1, '华东区', '包括上海、江苏、浙江等地'),
(1, '华北区', '包括北京、天津、河北等地'),
(1, '华南区', '包括广东、广西、海南等地');

SET FOREIGN_KEY_CHECKS = 1;
