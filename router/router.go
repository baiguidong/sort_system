package router

import (
	"sorting-system/handlers"
	"sorting-system/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS配置
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "X-User-ID", "Token"}
	r.Use(cors.New(config))

	// 静态文件服务
	// r.Static("/uploads", "./uploads")
	r.GET("/uploads/:filename", handlers.HandleImage)
	r.Static("/static", "./static")

	// 根路径重定向到登录页
	r.GET("/", func(c *gin.Context) {
		c.Redirect(302, "/login")
	})

	// 登录页面
	r.GET("/login", func(c *gin.Context) {
		c.File("./static/login.html")
	})

	// 主页面
	r.GET("/index", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// 区域管理页面
	r.GET("/area", func(c *gin.Context) {
		c.File("./static/area.html")
	})

	// 到货图页面
	r.GET("/arrival", func(c *gin.Context) {
		c.File("./static/arrival.html")
	})

	// 公开接口
	r.POST("/api/login", handlers.Login)

	// 需要认证的接口
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// 用户信息
		api.GET("/user/info", handlers.GetUserInfo)

		// 区域管理
		api.POST("/areas", handlers.CreateArea)
		api.GET("/areas", handlers.GetAreaList)
		api.GET("/areas/:id", handlers.GetArea)
		api.PUT("/areas/:id", handlers.UpdateArea)
		api.DELETE("/areas/:id", handlers.DeleteArea)

		// 商品管理
		api.POST("/products", handlers.CreateProduct)
		api.GET("/products", handlers.GetProductList)
		api.GET("/products/:id", handlers.GetProduct)
		api.PUT("/products/:id", handlers.UpdateProduct)
		api.PATCH("/products/:id/field", handlers.UpdateProductField)
		api.POST("/products/delete", handlers.DeleteProducts)

		// 到货图管理
		api.POST("/arrivals", handlers.CreateArrival)
		api.GET("/arrivals", handlers.GetArrivalList)
		api.GET("/arrivals/:id", handlers.GetArrival)
		api.PUT("/arrivals/:id", handlers.UpdateArrival)
		api.PATCH("/arrivals/:id/field", handlers.UpdateArrivalField)
		api.POST("/arrivals/delete", handlers.DeleteArrivals)

		// 文件上传
		api.POST("/upload", handlers.UploadImage)
	}

	return r
}
