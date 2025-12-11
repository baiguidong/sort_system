package database

import (
	"database/sql"
	"fmt"
	"sorting-system/config"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() error {
	var err error
	dsn := config.GlobalConfig.Database.GetDSN()

	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("打开数据库连接失败: %v", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	DB.SetMaxOpenConns(100)
	DB.SetMaxIdleConns(10)

	fmt.Println("数据库连接成功!")
	return nil
}

func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}
