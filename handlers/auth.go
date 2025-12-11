package handlers

import (
	"net/http"
	"sorting-system/models"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Name string `json:"name" binding:"required"`
	Pwd  string `json:"pwd" binding:"required"`
}

type LoginResponse struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	Token  string `json:"token"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	user, err := models.GetUserByNameAndPwd(req.Name, req.Pwd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
		return
	}

	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": LoginResponse{
			UserID: user.ID,
			Name:   user.Name,
			Token:  user.Token,
		},
		"message": "登录成功",
	})
}

func GetUserInfo(c *gin.Context) {
	userID := c.GetInt("user_id")

	user, err := models.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": user,
	})
}
