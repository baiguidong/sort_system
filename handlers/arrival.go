package handlers

import (
	"net/http"
	"sorting-system/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateArrival(c *gin.Context) {
	userID := c.GetInt("user_id")

	var arrival models.Arrival
	if err := c.ShouldBindJSON(&arrival); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	arrival.UserID = userID

	if err := models.CreateArrival(&arrival); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    arrival,
		"message": "创建成功",
	})
}

func UpdateArrival(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var arrival models.Arrival
	if err := c.ShouldBindJSON(&arrival); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	arrival.ID = id
	arrival.UserID = userID

	if err := models.UpdateArrival(&arrival); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    arrival,
		"message": "更新成功",
	})
}

func UpdateArrivalField(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var req struct {
		Field string      `json:"field" binding:"required"`
		Value interface{} `json:"value"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 转换值类型
	var value interface{} = req.Value
	if v, ok := req.Value.(string); ok {
		value = v
	}

	arrival, err := models.UpdateArrivalField(id, userID, req.Field, value)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    arrival,
		"message": "更新成功",
	})
}

func DeleteArrivals(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if err := models.DeleteArrivals(req.IDs, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

func GetArrivalList(c *gin.Context) {
	userID := c.GetInt("user_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	orderBy := c.DefaultQuery("order_by", "id")
	orderDir := c.DefaultQuery("order_dir", "DESC")
	keyword := c.DefaultQuery("keyword", "")
	startTime := c.DefaultQuery("start_time", "")
	endTime := c.DefaultQuery("end_time", "")

	if page < 1 {
		page = 1
	}

	result, err := models.GetArrivalList(userID, page, pageSize, orderBy, orderDir, keyword, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": result,
	})
}

func GetArrival(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	arrival, err := models.GetArrivalByID(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	if arrival == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": arrival,
	})
}
