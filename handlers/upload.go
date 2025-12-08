package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sorting-system/config"
	"strings"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/disintegration/imaging"
)

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "上传文件失败"})
		return
	}

	// 检查文件大小
	if file.Size > config.GlobalConfig.Upload.MaxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件大小超过限制"})
		return
	}

	// 检查文件类型
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "只支持 jpg, jpeg, png, gif 格式"})
		return
	}

	// 创建上传目录
	uploadPath := config.GlobalConfig.Upload.Path
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建上传目录失败"})
		return
	}

	// 生成唯一文件名
	filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), generateRandomString(8), ext)
	filePath := filepath.Join(uploadPath, filename)

	// 保存文件
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}

	// 返回文件访问路径
	url := fmt.Sprintf("/uploads/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"url": url,
		},
		"message": "上传成功",
	})
}

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}

func HandleImage(c *gin.Context) {
    fileName := c.Param("filename")
    srcPath := filepath.Join("uploads", fileName)

    // 原图是否存在？
    if _, err := os.Stat(srcPath); err != nil {
        c.String(http.StatusNotFound, "file not found")
        return
    }

    // 获取 w/h 参数
    wStr := c.Query("w")
    hStr := c.Query("h")

    // 不带参数 → 返回原图
    if wStr == "" && hStr == "" {
        c.File(srcPath)
        return
    }

    // 缩放尺寸
    w, _ := strconv.Atoi(wStr)
    h, _ := strconv.Atoi(hStr)
    if w <= 0 { w = 0 }
    if h <= 0 { h = 0 }

    // 缩略图缓存文件名
    cacheDir := filepath.Join("uploads", "cache")
    os.MkdirAll(cacheDir, 0755)

    cacheName := fileName + "_w" + wStr + "_h" + hStr + filepath.Ext(fileName)
    cachePath := filepath.Join(cacheDir, cacheName)

    // 如果已缓存，直接返回
    if _, err := os.Stat(cachePath); err == nil {
        c.File(cachePath)
        return
    }

    // 生成缩略图
    img, err := imaging.Open(srcPath)
    if err != nil {
        c.String(http.StatusInternalServerError, "load error")
        return
    }

    // Resize 保持比例 (任意一个为0则自动计算)
    thumb := imaging.Resize(img, w, h, imaging.Lanczos)

    // 保存到 cache
    if err := imaging.Save(thumb, cachePath); err != nil {
        c.String(http.StatusInternalServerError, "save error")
        return
    }

    // 返回图片
    c.File(cachePath)
}