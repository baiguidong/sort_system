package models

import (
	"database/sql"
	"fmt"
	"sorting-system/database"
	"strings"
)

type Arrival struct {
	ID            int    `json:"id"`
	UserID        int    `json:"user_id"`
	ArrivalPhoto  string `json:"arrival_photo"`
	Quantity      string `json:"quantity"`
	Brand         string `json:"brand"`
	BoxNumber     string `json:"box_number"`
	ArrivalDate   string `json:"arrival_date"`
	ConfirmPerson string `json:"confirm_person"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type ArrivalListResponse struct {
	Total    int64      `json:"total"`
	Page     int        `json:"page"`
	PageSize int        `json:"page_size"`
	List     []*Arrival `json:"list"`
}

func CreateArrival(a *Arrival) error {
	result, err := database.DB.Exec(
		`INSERT INTO cc_arrival
		(user_id, arrival_photo, quantity, brand, box_number, arrival_date, confirm_person)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		a.UserID, a.ArrivalPhoto, a.Quantity, a.Brand, a.BoxNumber, a.ArrivalDate, a.ConfirmPerson,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	a.ID = int(id)
	return nil
}

func UpdateArrival(a *Arrival) error {
	_, err := database.DB.Exec(
		`UPDATE cc_arrival SET
		arrival_photo=?, quantity=?, brand=?, box_number=?, arrival_date=?, confirm_person=?
		WHERE id=? AND user_id=?`,
		a.ArrivalPhoto, a.Quantity, a.Brand, a.BoxNumber, a.ArrivalDate, a.ConfirmPerson,
		a.ID, a.UserID,
	)
	return err
}

func UpdateArrivalField(id, userID int, field string, value interface{}) (*Arrival, error) {
	// 获取当前到货记录
	arrival, err := GetArrivalByID(id, userID)
	if err != nil {
		return nil, err
	}
	if arrival == nil {
		return nil, fmt.Errorf("记录不存在")
	}

	// 更新指定字段
	switch field {
	case "arrival_photo":
		arrival.ArrivalPhoto = value.(string)
	case "quantity":
		arrival.Quantity = value.(string)
	case "brand":
		arrival.Brand = value.(string)
	case "box_number":
		arrival.BoxNumber = value.(string)
	case "arrival_date":
		arrival.ArrivalDate = value.(string)
	case "confirm_person":
		arrival.ConfirmPerson = value.(string)
	}

	// 保存
	err = UpdateArrival(arrival)
	if err != nil {
		return nil, err
	}

	return arrival, nil
}

func DeleteArrivals(ids []int, userID int) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids)+1)
	args[0] = userID

	for i, id := range ids {
		placeholders[i] = "?"
		args[i+1] = id
	}

	query := fmt.Sprintf("DELETE FROM cc_arrival WHERE user_id=? AND id IN (%s)",
		strings.Join(placeholders, ","))
	_, err := database.DB.Exec(query, args...)
	return err
}

func GetArrivalByID(id, userID int) (*Arrival, error) {
	a := &Arrival{}
	err := database.DB.QueryRow(
		`SELECT id, user_id, arrival_photo, quantity, brand, box_number, arrival_date, confirm_person,
		created_at, updated_at
		FROM cc_arrival WHERE id=? AND user_id=?`,
		id, userID,
	).Scan(
		&a.ID, &a.UserID, &a.ArrivalPhoto, &a.Quantity, &a.Brand, &a.BoxNumber, &a.ArrivalDate, &a.ConfirmPerson,
		&a.CreatedAt, &a.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return a, nil
}

func GetArrivalList(userID, page, pageSize int, orderBy, orderDir, keyword, startTime, endTime string) (*ArrivalListResponse, error) {
	// 验证排序字段
	validOrderFields := map[string]bool{
		"id": true, "quantity": true, "brand": true, "box_number": true,
		"arrival_date": true, "confirm_person": true, "created_at": true, "updated_at": true,
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
	whereClause := "WHERE user_id=?"
	args := []interface{}{userID}

	if keyword != "" {
		whereClause += " AND (quantity LIKE ? OR brand LIKE ? OR box_number LIKE ? OR confirm_person LIKE ?)"
		searchPattern := "%" + keyword + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// 添加时间范围查询
	if startTime != "" {
		whereClause += " AND arrival_date >= ?"
		args = append(args, startTime)
	}
	if endTime != "" {
		whereClause += " AND arrival_date <= ?"
		args = append(args, endTime)
	}

	// 获取总数
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM cc_arrival %s", whereClause)
	err := database.DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// 获取列表
	offset := (page - 1) * pageSize
	query := fmt.Sprintf(`
		SELECT id, user_id, arrival_photo, quantity, brand, box_number, arrival_date, confirm_person,
		created_at, updated_at
		FROM cc_arrival
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

	list := []*Arrival{}
	for rows.Next() {
		a := &Arrival{}
		err := rows.Scan(
			&a.ID, &a.UserID, &a.ArrivalPhoto, &a.Quantity, &a.Brand, &a.BoxNumber, &a.ArrivalDate, &a.ConfirmPerson,
			&a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}

	return &ArrivalListResponse{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		List:     list,
	}, nil
}
