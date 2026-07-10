package main

import (
	"log"
	"safevault-backend/controllers"
	"safevault-backend/database"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Iniciando SafeVault Backend...")

	// Inicializa banco de dados
	database.Connect()

	// Inicializa roteador Gin
	r := gin.Default()

	// CORS Restrito (Melhoria de Segurança)
	r.Use(func(c *gin.Context) {
		// Permitir apenas do painel admin web e app local
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-ID")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Rota Protegida de Storage
	r.GET("/storage/:device_id/:filename", func(c *gin.Context) {
		deviceID := c.Param("device_id")
		filename := c.Param("filename")
		reqDeviceID := c.GetHeader("X-Device-ID")
		
		// Segurança: Só permite baixar se enviar o Header X-Device-ID correspondente
		if reqDeviceID != deviceID {
			c.AbortWithStatusJSON(403, gin.H{"error": "Acesso Negado. Credenciais inválidas para este arquivo."})
			return
		}
		c.File("./storage/" + deviceID + "/" + filename)
	})

	api := r.Group("/api")
	{
		api.GET("/status", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "message": "SafeVault API Online"})
		})
		
		// Auth & Subscriptions
		api.POST("/auth/register", controllers.RegisterDevice)
		api.POST("/subscriptions/trial", controllers.StartTrial)
		api.POST("/subscriptions/upgrade", controllers.UpgradeToPro)

		// Cloud Sync (Upload & Download via Servidor - Depreciado para Egress Zero)
		api.POST("/backup/upload", controllers.UploadFile)
		api.GET("/backup/list/:device_id", controllers.ListFiles)

		// Engenharia de Custos: Upload Direto S3 / R2
		api.GET("/storage/presigned-url", controllers.GeneratePresignedURL)
		api.PUT("/storage/s3-put-mock", controllers.S3PutMock)

		// Webhooks Financeiros (RevenueCat / Apple / Google)
		api.POST("/webhooks/revenuecat", controllers.HandleRevenueCatWebhook)

		// Links de Autodestruição (Snapchat style)
		api.POST("/links/generate", controllers.GenerateSecureLink)
		api.GET("/links/view/:token", controllers.ViewSecureLink)

		// Admin Dashboard
		api.GET("/admin/stats", controllers.GetAdminStats)
	}

	log.Println("Servidor rodando na porta 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
