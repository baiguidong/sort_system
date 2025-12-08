# 分拣系统

一个基于 Golang Gin 框架和原生 JavaScript 开发的商品分拣管理系统，支持类 Excel 表格编辑、图片上传、自动计算等功能。

## 功能特性

- 用户登录认证
- 类 Excel 的表格展示和编辑
- 单元格点击编辑，自动保存
- 自动计算功能（成本RMB、总成本、净利润）
- 图片上传、查看和修改
- 分页、排序、查询功能
- 行选择和批量删除
- 汇总行固定在底部
- 响应式设计

## 技术栈

### 后端
- Golang 1.21+
- Gin Web Framework
- MySQL 数据库
- YAML 配置文件

### 前端
- HTML5
- CSS3
- 原生 JavaScript
- Fetch API

## 项目结构

```
ss/
├── config/
│   ├── config.yaml          # 配置文件
│   └── config.go            # 配置加载
├── database/
│   ├── db.go                # 数据库连接
│   └── schema.sql           # 数据库表结构
├── models/
│   ├── user.go              # 用户模型
│   └── product.go           # 商品模型
├── handlers/
│   ├── auth.go              # 认证处理
│   ├── product.go           # 商品处理
│   └── upload.go            # 上传处理
├── middleware/
│   └── auth.go              # 认证中间件
├── router/
│   └── router.go            # 路由配置
├── static/
│   ├── css/
│   │   └── style.css        # 样式文件
│   ├── js/
│   │   ├── common.js        # 公共函数
│   │   ├── login.js         # 登录逻辑
│   │   └── main.js          # 主页逻辑
│   ├── login.html           # 登录页面
│   └── index.html           # 主页面
├── uploads/                 # 上传文件目录（自动创建）
├── main.go                  # 主程序入口
└── go.mod                   # Go 模块文件
```

## 安装部署

### 1. 环境要求

- Go 1.21 或更高版本
- MySQL 5.7 或更高版本

### 2. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE cc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入表结构
USE cc;
SOURCE database/schema.sql;
```

### 3. 配置数据库

编辑 `config/config.yaml` 文件，修改数据库连接信息：

```yaml
database:
  host: localhost
  port: 3306
  username: root
  password: your_password  # 修改为你的密码
  database: cc
  charset: utf8mb4
```

### 4. 安装依赖

```bash
go mod download
```

### 5. 运行项目

```bash
go run main.go
```

服务器将在 http://localhost:8080 启动

### 6. 访问系统

在浏览器中打开：http://localhost:8080

系统会自动跳转到登录页面。你也可以直接访问：
- 登录页面：http://localhost:8080/login
- 主页面：http://localhost:8080/index （需要先登录）

默认测试账号：
- 用户名：admin
- 密码：123456

或
- 用户名：test
- 密码：test123

## API 接口文档

### 认证接口

#### 登录
- **URL**: `/api/login`
- **方法**: `POST`
- **参数**:
  ```json
  {
    "name": "admin",
    "pwd": "123456"
  }
  ```
- **返回**:
  ```json
  {
    "code": 0,
    "data": {
      "user_id": 1,
      "name": "admin"
    },
    "message": "登录成功"
  }
  ```

#### 获取用户信息
- **URL**: `/api/user/info`
- **方法**: `GET`
- **Headers**: `X-User-ID: 1`

### 商品接口

#### 创建商品
- **URL**: `/api/products`
- **方法**: `POST`
- **Headers**: `X-User-ID: 1`
- **参数**:
  ```json
  {
    "customer_name": "客户名",
    "size": "L",
    "address": "收件地址",
    "cost_eur": 100.00,
    "exchange_rate": 7.8,
    "price_rmb": 1000.00,
    "shipping_fee": 50.00
  }
  ```

#### 获取商品列表
- **URL**: `/api/products?page=1&page_size=20&order_by=id&order_dir=DESC`
- **方法**: `GET`
- **Headers**: `X-User-ID: 1`

#### 更新商品字段
- **URL**: `/api/products/:id/field`
- **方法**: `PATCH`
- **Headers**: `X-User-ID: 1`
- **参数**:
  ```json
  {
    "field": "customer_name",
    "value": "新客户名"
  }
  ```

#### 删除商品
- **URL**: `/api/products/delete`
- **方法**: `POST`
- **Headers**: `X-User-ID: 1`
- **参数**:
  ```json
  {
    "ids": [1, 2, 3]
  }
  ```

#### 上传图片
- **URL**: `/api/upload`
- **方法**: `POST`
- **Headers**: `X-User-ID: 1`
- **Content-Type**: `multipart/form-data`
- **参数**: `file` (图片文件)

## 数据库表结构

### cc_user (用户表)
- `id` - 主键
- `name` - 用户名（唯一）
- `pwd` - 密码（明文）
- `created_at` - 创建时间
- `updated_at` - 更新时间

### cc_product (商品表)
- `id` - 主键
- `user_id` - 用户ID（外键）
- `photo` - 照片URL
- `customer_name` - 客户名
- `size` - 尺码
- `address` - 收件地址
- `status_note_photo` - 货物状态备注图片
- `cost_eur` - 成本欧元
- `exchange_rate` - 结账汇率
- `cost_rmb` - 成本RMB（自动计算 = cost_eur * exchange_rate）
- `price_rmb` - 售价RMB
- `shipping_fee` - 国际运费与清关费
- `total_cost` - 总成本（自动计算 = cost_rmb + shipping_fee）
- `profit` - 净利润（自动计算 = price_rmb - total_cost）
- `created_at` - 创建时间
- `updated_at` - 更新时间

## 使用说明

### 登录
1. 打开登录页面
2. 输入用户名和密码
3. 点击登录按钮

### 查看商品列表
- 登录后自动显示当前用户的商品列表
- 支持分页浏览
- 点击列标题可排序

### 添加商品
1. 点击"增加"按钮
2. 在表格头部会新增一行空白数据
3. 点击单元格填写信息
4. 自动保存到服务器

### 编辑商品
1. 点击要编辑的单元格
2. 输入新值
3. 按回车或点击外部区域自动保存

### 上传图片
- 照片列和货物状态图片列点击即可上传
- 已有图片点击可放大查看
- 放大后可点击"修改图片"按钮更换

### 删除商品
1. 勾选要删除的行
2. 点击"删除"按钮
3. 确认后删除

### 自动计算
系统会自动计算以下字段：
- **成本RMB** = 成本欧元 × 结账汇率
- **总成本** = 成本RMB + 国际运费与清关费
- **净利润** = 售价RMB - 总成本

### 汇总行
表格底部固定显示所有数据的汇总，包括：
- 成本欧元总计
- 成本RMB总计
- 售价RMB总计
- 运费总计
- 总成本总计
- 净利润总计

## 注意事项

1. 首次运行前请确保数据库已创建并导入表结构
2. 修改配置文件中的数据库密码
3. 上传的图片保存在 `uploads` 目录
4. 系统使用明文密码，生产环境请改为加密存储
5. 认证使用简单的 Header 传递，生产环境建议使用 JWT

## 开发计划

- [ ] 添加用户注册功能
- [ ] 实现密码加密
- [ ] 使用 JWT 认证
- [ ] 添加搜索功能
- [ ] 导出Excel功能
- [ ] 数据统计图表

## 许可证

MIT License
