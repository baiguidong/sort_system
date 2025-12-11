package handlers

import (
	"net/http"
	"sorting-system/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateProduct(c *gin.Context) {
	userID := c.GetInt("user_id")

	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	product.UserID = userID

	if err := models.CreateProduct(&product); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    product,
		"message": "创建成功",
	})
}

func UpdateProduct(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	product.ID = id
	product.UserID = userID

	if err := models.UpdateProduct(&product); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    product,
		"message": "更新成功",
	})
}

func UpdateProductField(c *gin.Context) {
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

	if userID != 1 {
		if req.Field == "status_note_photo" || req.Field == "photo" || req.Field == "mark" {

		} else {
			c.JSON(http.StatusOK, gin.H{
				"code":    -1,
				"message": "你没有权限更改这个字段",
			})
			return
		}
	}
	// 转换数字类型
	var value interface{} = req.Value
	if req.Field == "cost_eur" || req.Field == "exchange_rate" ||
		req.Field == "price_rmb" || req.Field == "shipping_fee" {
		if v, ok := req.Value.(float64); ok {
			value = v
		} else if v, ok := req.Value.(string); ok {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				value = f
			}
		}
	} else if v, ok := req.Value.(string); ok {
		value = v
	}

	product, err := models.UpdateProductField(id, userID, req.Field, value)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"data":    product,
		"message": "更新成功",
	})
}

func DeleteProducts(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if err := models.DeleteProducts(req.IDs, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

func GetProductList(c *gin.Context) {
	userID := c.GetInt("user_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	orderBy := c.DefaultQuery("order_by", "id")
	orderDir := c.DefaultQuery("order_dir", "DESC")
	keyword := c.DefaultQuery("keyword", "")
	startTime := c.DefaultQuery("start_time", "")
	endTime := c.DefaultQuery("end_time", "")

	// 解析区域ID
	var areaID *int
	if areaIDStr := c.DefaultQuery("area_id", ""); areaIDStr != "" {
		if id, err := strconv.Atoi(areaIDStr); err == nil {
			areaID = &id
		}
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	result, err := models.GetProductList(userID, page, pageSize, orderBy, orderDir, keyword, startTime, endTime, areaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": result,
	})
}

func GetProduct(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	product, err := models.GetProductByID(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	if product == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": product,
	})
}
