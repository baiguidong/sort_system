package handlers

import (
	"net/http"
	"sorting-system/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CreateArea 创建区域
func CreateArea(c *gin.Context) {
	userID := c.GetInt("user_id")

	var area models.Area
	if err := c.ShouldBindJSON(&area); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	area.UserID = userID

	if err := models.CreateArea(&area); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    area,
		"message": "创建成功",
	})
}

// UpdateArea 更新区域
func UpdateArea(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var area models.Area
	if err := c.ShouldBindJSON(&area); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	area.ID = id
	area.UserID = userID

	if err := models.UpdateArea(&area); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    area,
		"message": "更新成功",
	})
}

// DeleteArea 删除区域
func DeleteArea(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	if err := models.DeleteArea(id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// GetArea 获取单个区域
func GetArea(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	area, err := models.GetAreaByID(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	if area == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "区域不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": area,
	})
}

// GetAreaList 获取区域列表
func GetAreaList(c *gin.Context) {
	userID := c.GetInt("user_id")

	result, err := models.GetAreaList(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": result,
	})
}
