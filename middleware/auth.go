package middleware

import (
	"net/http"
	"sorting-system/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetHeader("X-User-ID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权，请先登录"})
			c.Abort()
			return
		}

		uid, err := strconv.Atoi(userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的用户ID"})
			c.Abort()
			return
		}
		token := c.GetHeader("Token")
		u, err := models.DecodeUser(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的token"})
			c.Abort()
			return
		}
		if u.UserID != int64(uid) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token 错误"})
			c.Abort()
			return
		}
		c.Set("user_id", uid)
		c.Next()
	}
}
