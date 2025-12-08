package models

import (
	"database/sql"
	"sorting-system/database"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Pwd  string `json:"-"` // 不返回密码
}

func GetUserByNameAndPwd(name, pwd string) (*User, error) {
	user := &User{}
	err := database.DB.QueryRow(
		"SELECT id, name FROM cc_user WHERE name = ? AND pwd = ?",
		name, pwd,
	).Scan(&user.ID, &user.Name)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func GetUserByID(id int) (*User, error) {
	user := &User{}
	err := database.DB.QueryRow(
		"SELECT id, name FROM cc_user WHERE id = ?",
		id,
	).Scan(&user.ID, &user.Name)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}
