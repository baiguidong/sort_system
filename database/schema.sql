-- 用户表（已存在，这里提供参考结构）
CREATE TABLE IF NOT EXISTS `cc_user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '用户名',
  `pwd` VARCHAR(255) NOT NULL COMMENT '密码',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 区域表
CREATE TABLE IF NOT EXISTS `cc_product_area` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '区域名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '区域描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `cc_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区域表';

-- 商品表
CREATE TABLE IF NOT EXISTS `cc_product` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `area_id` INT DEFAULT NULL COMMENT '区域ID',
  `photo` VARCHAR(500) DEFAULT NULL COMMENT '照片URL',
  `customer_name` VARCHAR(200) DEFAULT NULL COMMENT '客户名',
  `size` VARCHAR(50) DEFAULT NULL COMMENT '尺码',
  `quantity` INT DEFAULT 0 COMMENT '件数（自动从尺码解析）',
  `address` TEXT DEFAULT NULL COMMENT '收件地址',
  `mark` TEXT DEFAULT NULL COMMENT '备注',
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
  KEY `idx_area_id` (`area_id`),
  FOREIGN KEY (`user_id`) REFERENCES `cc_user` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`area_id`) REFERENCES `cc_product_area` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 创建到货图表
CREATE TABLE IF NOT EXISTS `cc_arrival` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `arrival_photo` varchar(500) DEFAULT '' COMMENT '到货照片',
  `quantity` varchar(100) DEFAULT '' COMMENT '到货件数',
  `brand` varchar(200) DEFAULT '' COMMENT '到货品牌',
  `box_number` varchar(200) DEFAULT '' COMMENT '到货箱子单号',
  `arrival_date` varchar(100) DEFAULT '' COMMENT '到货时间日期',
  `confirm_person` varchar(100) DEFAULT '' COMMENT '到货点数确认人员',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_arrival_date` (`arrival_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='到货图表';


-- 插入测试用户数据
INSERT INTO `cc_user` (`name`, `pwd`) VALUES
('admin', '123456'),
('test', 'test123')
ON DUPLICATE KEY UPDATE `name`=`name`;
