package models

import (
	"database/sql"
	"sorting-system/database"
)

type Area struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type AreaListResponse struct {
	Total int     `json:"total"`
	List  []*Area `json:"list"`
}

// CreateArea 创建区域
func CreateArea(a *Area) error {
	result, err := database.DB.Exec(
		`INSERT INTO cc_product_area (user_id, name, description) VALUES (?, ?, ?)`,
		a.UserID, a.Name, a.Description,
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

// UpdateArea 更新区域
func UpdateArea(a *Area) error {
	_, err := database.DB.Exec(
		`UPDATE cc_product_area SET name=?, description=? WHERE id=? AND user_id=?`,
		a.Name, a.Description, a.ID, a.UserID,
	)
	return err
}

// DeleteArea 删除区域
func DeleteArea(id, userID int) error {
	_, err := database.DB.Exec(
		`DELETE FROM cc_product_area WHERE id=? AND user_id=?`,
		id, userID,
	)
	return err
}

// GetAreaByID 根据ID获取区域
func GetAreaByID(id, userID int) (*Area, error) {
	area := &Area{}
	err := database.DB.QueryRow(
		`SELECT id, user_id, name, description, created_at, updated_at
		FROM cc_product_area WHERE id=? AND user_id=?`,
		id, userID,
	).Scan(&area.ID, &area.UserID, &area.Name, &area.Description, &area.CreatedAt, &area.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return area, nil
}

// GetAreaList 获取区域列表
func GetAreaList(userID int) (*AreaListResponse, error) {
	// 获取总数
	var total int
	err := database.DB.QueryRow(
		`SELECT COUNT(*) FROM cc_product_area`,
	).Scan(&total)
	if err != nil {
		return nil, err
	}

	// 获取列表
	rows, err := database.DB.Query(
		`SELECT id, user_id, name, description, created_at, updated_at
		FROM cc_product_area ORDER BY id ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Area, 0)
	for rows.Next() {
		area := &Area{}
		err := rows.Scan(&area.ID, &area.UserID, &area.Name, &area.Description, &area.CreatedAt, &area.UpdatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, area)
	}

	return &AreaListResponse{
		Total: total,
		List:  list,
	}, nil
}
