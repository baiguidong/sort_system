package models

import (
	"database/sql"
	"fmt"
	"regexp"
	"sorting-system/database"
	"strings"
)

type Product struct {
	SID             int     `json:"sid"`
	ID              int     `json:"id"`
	UserID          int     `json:"user_id"`
	AreaID          *int    `json:"area_id"`
	Photo           string  `json:"photo"`
	CustomerName    string  `json:"customer_name"`
	Brand           string  `json:"brand"`
	Size            string  `json:"size"`
	Quantity        int     `json:"quantity"`
	Address         string  `json:"address"`
	Mark            string  `json:"mark"`
	StatusNotePhoto string  `json:"status_note_photo"`
	CostEur         float64 `json:"cost_eur"`
	ExchangeRate    float64 `json:"exchange_rate"`
	CostRMB         float64 `json:"cost_rmb"`
	PriceRMB        float64 `json:"price_rmb"`
	ShippingFee     float64 `json:"shipping_fee"`
	TotalCost       float64 `json:"total_cost"`
	Profit          float64 `json:"profit"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

type ProductListResponse struct {
	Total    int64      `json:"total"`
	Page     int        `json:"page"`
	PageSize int        `json:"page_size"`
	List     []*Product `json:"list"`
	Summary  *Summary   `json:"summary"`
}

type Summary struct {
	TotalCostEur     float64 `json:"total_cost_eur"`
	TotalCostRMB     float64 `json:"total_cost_rmb"`
	TotalPriceRMB    float64 `json:"total_price_rmb"`
	TotalShippingFee float64 `json:"total_shipping_fee"`
	TotalCost        float64 `json:"total_cost"`
	TotalProfit      float64 `json:"total_profit"`
	TotalQuantity    int     `json:"total_quantity"`
}

// parseQuantityFromSize 从尺码字符串中解析件数
func parseQuantityFromSize(size string) int {
	if size == "" {
		return 0
	}

	// 中文数字映射
	chineseNumbers := map[string]int{
		"一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
		"六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
	}

	size = strings.ToLower(size)

	// 尝试匹配 "N件" 或 "N个" 等格式（N为数字）
	re1 := regexp.MustCompile(`(\d+)\s*[件个條条]`)
	if matches := re1.FindStringSubmatch(size); len(matches) > 1 {
		var qty int
		fmt.Sscanf(matches[1], "%d", &qty)
		if qty > 0 {
			return qty
		}
	}

	// 尝试匹配中文数字 + 件
	for chinese, num := range chineseNumbers {
		if strings.Contains(size, chinese) && (strings.Contains(size, "件") || strings.Contains(size, "个") || strings.Contains(size, "條") || strings.Contains(size, "条")) {
			return num
		}
	}

	// 默认返回1（有尺码就算1件）
	if size != "" {
		return 1
	}

	return 0
}

func CreateProduct(p *Product) error {
	// 计算字段
	p.Quantity = parseQuantityFromSize(p.Size)
	p.CostRMB = p.CostEur * p.ExchangeRate
	p.TotalCost = p.CostRMB + p.ShippingFee
	p.Profit = p.PriceRMB - p.TotalCost

	result, err := database.DB.Exec(
		`INSERT INTO cc_product
		(user_id, area_id, photo, customer_name, size, quantity, address, status_note_photo,
		cost_eur, exchange_rate, cost_rmb, price_rmb, shipping_fee, total_cost, profit,mark,brand)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.UserID, p.AreaID, p.Photo, p.CustomerName, p.Size, p.Quantity, p.Address, p.StatusNotePhoto,
		p.CostEur, p.ExchangeRate, p.CostRMB, p.PriceRMB, p.ShippingFee, p.TotalCost, p.Profit, p.Mark, p.Brand,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	p.ID = int(id)
	return nil
}

func UpdateProduct(p *Product) error {
	// 计算字段
	p.Quantity = parseQuantityFromSize(p.Size)
	p.CostRMB = p.CostEur * p.ExchangeRate
	p.TotalCost = p.CostRMB + p.ShippingFee
	p.Profit = p.PriceRMB - p.TotalCost

	_, err := database.DB.Exec(
		`UPDATE cc_product SET
		area_id=?, photo=?, customer_name=?, size=?, quantity=?, address=?, status_note_photo=?,
		cost_eur=?, exchange_rate=?, cost_rmb=?, price_rmb=?, shipping_fee=?,
		total_cost=?, profit=?,mark=?,brand=? 
		WHERE id=?`,
		p.AreaID, p.Photo, p.CustomerName, p.Size, p.Quantity, p.Address, p.StatusNotePhoto,
		p.CostEur, p.ExchangeRate, p.CostRMB, p.PriceRMB, p.ShippingFee,
		p.TotalCost, p.Profit, p.Mark, p.Brand, p.ID,
	)
	return err
}

func UpdateProductField(id, userID int, field string, value interface{}) (*Product, error) {
	// 获取当前产品
	product, err := GetProductByID(id, userID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, fmt.Errorf("产品不存在")
	}

	// 更新指定字段
	switch field {
	case "area_id":
		if value == nil {
			product.AreaID = nil
		} else {
			areaID := int(value.(float64))
			product.AreaID = &areaID
		}
	case "photo":
		product.Photo = value.(string)
	case "customer_name":
		product.CustomerName = value.(string)
	case "brand":
		product.Brand = value.(string)
	case "size":
		product.Size = value.(string)
		product.Quantity = parseQuantityFromSize(product.Size)
	case "address":
		product.Address = value.(string)
	case "mark":
		product.Mark = value.(string)
	case "status_note_photo":
		product.StatusNotePhoto = value.(string)
	case "cost_eur":
		product.CostEur = value.(float64)
	case "exchange_rate":
		product.ExchangeRate = value.(float64)
	case "price_rmb":
		product.PriceRMB = value.(float64)
	case "shipping_fee":
		product.ShippingFee = value.(float64)
	}

	// 重新计算
	product.CostRMB = product.CostEur * product.ExchangeRate
	product.TotalCost = product.CostRMB + product.ShippingFee
	product.Profit = product.PriceRMB - product.TotalCost

	// 保存
	err = UpdateProduct(product)
	if err != nil {
		return nil, err
	}

	return product, nil
}

func DeleteProducts(ids []int, userID int) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))

	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf("DELETE FROM cc_product WHERE id IN (%s)",
		strings.Join(placeholders, ","))
	_, err := database.DB.Exec(query, args...)
	return err
}

func GetProductByID(id, userID int) (*Product, error) {
	p := &Product{}
	err := database.DB.QueryRow(
		`SELECT id, user_id, area_id, photo, customer_name, size, quantity, address, status_note_photo,
		cost_eur, exchange_rate, cost_rmb, price_rmb, shipping_fee, total_cost, profit,
		created_at, updated_at, mark, brand 
		FROM cc_product WHERE id=?`,
		id,
	).Scan(
		&p.ID, &p.UserID, &p.AreaID, &p.Photo, &p.CustomerName, &p.Size, &p.Quantity, &p.Address, &p.StatusNotePhoto,
		&p.CostEur, &p.ExchangeRate, &p.CostRMB, &p.PriceRMB, &p.ShippingFee, &p.TotalCost, &p.Profit,
		&p.CreatedAt, &p.UpdatedAt, &p.Mark, &p.Brand,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func GetProductList(userID, page, pageSize int, orderBy, orderDir, keyword, startTime, endTime string, areaID *int) (*ProductListResponse, error) {
	// 验证排序字段
	validOrderFields := map[string]bool{
		"id": true, "customer_name": true, "size": true, "cost_eur": true,
		"exchange_rate": true, "cost_rmb": true, "price_rmb": true,
		"shipping_fee": true, "total_cost": true, "profit": true, "created_at": true, "updated_at": true,
	}
	if orderBy == "" {
		orderBy = "id"
	}
	if !validOrderFields[orderBy] {
		orderBy = "id"
	}
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = "DESC"
	}

	// 构建WHERE条件
	// whereClause := "WHERE user_id=?"
	// args := []interface{}{userID}

	whereClause := "WHERE 1=1"
	args := []interface{}{}

	// 添加区域过滤
	if areaID != nil {
		whereClause += " AND area_id=?"
		args = append(args, *areaID)
	}

	if keyword != "" {
		whereClause += " AND (customer_name LIKE ? OR size LIKE ? OR address LIKE ? OR mark LIKE ? OR cost_eur LIKE ? OR cost_rmb LIKE ? OR price_rmb LIKE ? OR shipping_fee LIKE ? OR total_cost LIKE ? OR profit LIKE ? OR brand LIKE ?)"
		searchPattern := "%" + keyword + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// 添加时间范围查询
	if startTime != "" {
		whereClause += " AND updated_at >= ?"
		args = append(args, startTime)
	}
	if endTime != "" {
		whereClause += " AND updated_at <= ?"
		args = append(args, endTime)
	}

	// 获取总数
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM cc_product %s", whereClause)
	err := database.DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// 获取列表
	offset := (page - 1) * pageSize
	query := fmt.Sprintf(`
		SELECT id, user_id, area_id, photo, customer_name, size, quantity, address, status_note_photo,
		cost_eur, exchange_rate, cost_rmb, price_rmb, shipping_fee, total_cost, profit,
		created_at, updated_at, mark,brand 
		FROM cc_product
		%s
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, whereClause, orderBy, orderDir)

	queryArgs := append(args, pageSize, offset)
	rows, err := database.DB.Query(query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*Product{}
	sid := 0
	for rows.Next() {
		p := &Product{}
		err := rows.Scan(
			&p.ID, &p.UserID, &p.AreaID, &p.Photo, &p.CustomerName, &p.Size, &p.Quantity, &p.Address, &p.StatusNotePhoto,
			&p.CostEur, &p.ExchangeRate, &p.CostRMB, &p.PriceRMB, &p.ShippingFee, &p.TotalCost, &p.Profit,
			&p.CreatedAt, &p.UpdatedAt, &p.Mark, &p.Brand,
		)
		if err != nil {
			return nil, err
		}
		if userID != 1 {
			p.CostEur = 0.0
			p.ExchangeRate = 0.0
			p.CostRMB = 0.0
			p.TotalCost = 0.0
			p.Profit = 0.0
			p.ShippingFee = 0.0
		}
		sid++
		p.SID = sid
		list = append(list, p)
	}

	// 获取汇总数据
	summary, err := GetSummary(userID, areaID)
	if err != nil {
		return nil, err
	}

	return &ProductListResponse{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		List:     list,
		Summary:  summary,
	}, nil
}

func GetSummary(userID int, areaID *int) (*Summary, error) {
	summary := &Summary{}

	whereClause := "WHERE 1=1"
	args := []interface{}{}

	// 添加区域过滤
	if areaID != nil {
		whereClause += " AND area_id=?"
		args = append(args, *areaID)
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(cost_eur), 0),
			COALESCE(SUM(cost_rmb), 0),
			COALESCE(SUM(price_rmb), 0),
			COALESCE(SUM(shipping_fee), 0),
			COALESCE(SUM(total_cost), 0),
			COALESCE(SUM(profit), 0),
			COALESCE(SUM(quantity), 0)
		FROM cc_product
		%s
	`, whereClause)

	err := database.DB.QueryRow(query, args...).Scan(
		&summary.TotalCostEur,
		&summary.TotalCostRMB,
		&summary.TotalPriceRMB,
		&summary.TotalShippingFee,
		&summary.TotalCost,
		&summary.TotalProfit,
		&summary.TotalQuantity,
	)
	if err != nil {
		return nil, err
	}
	if userID != 1 {
		summary.TotalCostEur = 0.0
		summary.TotalCostRMB = 0.0
		summary.TotalPriceRMB = 0.0
		summary.TotalShippingFee = 0.0
		summary.TotalCost = 0.0
		summary.TotalProfit = 0.0
	}
	return summary, nil
}
