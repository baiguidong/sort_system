package models

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"sorting-system/database"
)

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Pwd   string `json:"-"` // 不返回密码
	Token string `json:"token"`
}

var secretKey = []byte("1234567890abcdef1234567890abcdef") // 32字节 AES-256

type UserInfo struct {
	UserID int64  `json:"uid"`
	Name   string `json:"name"`
}

// 生成 Token
func EncodeUser(userID int64, name string) (string, error) {
	info := UserInfo{
		UserID: userID,
		Name:   name,
	}

	// 1. 序列化 JSON
	plain, err := json.Marshal(info)
	if err != nil {
		return "", err
	}

	// 2. 创建 AES-GCM
	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// 3. 创建随机 nonce（12 字节）
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// 4. 加密（ciphertext + tag）
	cipherText := gcm.Seal(nil, nonce, plain, nil)

	// 5. 拼接 后 Base64
	token := append(nonce, cipherText...)
	return base64.RawURLEncoding.EncodeToString(token), nil
}

// 解析 Token
func DecodeUser(token string) (*UserInfo, error) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return nil, err
	}

	// 1. 初始化 AES-GCM
	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		return nil, fmt.Errorf("invalid token")
	}

	// 2. 提取
	nonce := raw[:nonceSize]
	cipherText := raw[nonceSize:]

	// 3. 解密
	plain, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return nil, fmt.Errorf("invalid token or corrupted data: %w", err)
	}

	// 4. 反序列化
	var u UserInfo
	if err := json.Unmarshal(plain, &u); err != nil {
		return nil, err
	}

	return &u, nil
}

func GetUserByNameAndPwd(name, pwd string) (*User, error) {
	user := &User{}
	var err error
	if name == "admin" {
		err = database.DB.QueryRow(
			"SELECT id, name FROM cc_user WHERE name = ? AND pwd_ss = ?",
			name, pwd,
		).Scan(&user.ID, &user.Name)
	} else {
		err = database.DB.QueryRow(
			"SELECT id, name FROM cc_user WHERE name = ? AND pwd = ?",
			name, pwd,
		).Scan(&user.ID, &user.Name)
	}

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	user.Token, err = EncodeUser(int64(user.ID), user.Name)
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
