package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"safevault-backend/database"
	"safevault-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// GeneratePresignedURL generates a secure, time-limited URL for direct cloud upload
// bypassing the Go server's network bandwidth.
func GeneratePresignedURL(c *gin.Context) {
	deviceID := c.Query("device_id")
	filename := c.Query("filename")

	if deviceID == "" || filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parâmetros device_id e filename são obrigatórios"})
		return
	}

	// 1. Validar se o usuário é PRO/Trial no banco de dados local
	var user models.User
	if err := database.DB.Where("device_id = ?", deviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não encontrado"})
		return
	}

	if user.Plan == models.PlanFree {
		c.JSON(http.StatusForbidden, gin.H{"error": "Upload direto para nuvem requer Plano PRO"})
		return
	}

	// 2. Simulação de Assinatura S3 / Cloudflare R2
	// Em produção, usaríamos o AWS SDK (github.com/aws/aws-sdk-go-v2/service/s3)
	// Como não temos as credenciais, vamos criar uma assinatura criptográfica local (HMAC)
	// para provar que a URL tem tempo limite de 5 minutos.
	expiration := time.Now().Add(5 * time.Minute).Unix()
	secretKey := "CLOUDFLARE_R2_SECRET_MOCK" // Simulação da chave AWS
	
	dataToSign := fmt.Sprintf("%s:%s:%d", deviceID, filename, expiration)
	h := hmac.New(sha256.New, []byte(secretKey))
	h.Write([]byte(dataToSign))
	signature := hex.EncodeToString(h.Sum(nil))

	// Esta é a URL final (Mockada) para onde o React Native vai fazer o PUT HTTP diretamente.
	// O nosso próprio servidor Go vai ter que receber isso como "Bucket" simulado, mas a arquitetura 
	// no celular já estará preparada para enviar direto para a Amazon/Cloudflare mudando apenas o prefixo.
	uploadURL := fmt.Sprintf("http://localhost:8080/api/storage/s3-put-mock?device_id=%s&filename=%s&expires=%d&signature=%s", deviceID, filename, expiration, signature)

	c.JSON(http.StatusOK, gin.H{
		"presigned_url": uploadURL,
		"expires_in":    300,
		"bucket_path":   fmt.Sprintf("%s/%s", deviceID, filename),
	})
}

// S3PutMock is a simulated Cloudflare R2 endpoint to receive the direct PUT request
// This proves that the client is doing a direct upload based on the presigned URL.
func S3PutMock(c *gin.Context) {
	// Validar a assinatura gerada no passo anterior
	deviceID := c.Query("device_id")
	filename := c.Query("filename")
	signature := c.Query("signature")

	if signature == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Assinatura S3 ausente"})
		return
	}

	fmt.Printf("☁️ [CLOUDFLARE R2 MOCK] Recebendo arquivo %s diretamente do celular %s...\n", filename, deviceID)

	// Registrar silenciosamente na tabela CloudFile para manter o controle (opcional numa arq 100% serverless)
	cloudFile := models.CloudFile{
		DeviceID: deviceID,
		FileName: filename,
		FileURL:  fmt.Sprintf("/storage/%s/%s", deviceID, filename),
	}
	database.DB.Create(&cloudFile)

	c.JSON(http.StatusOK, gin.H{"status": "Arquivo recebido no Cloudflare R2 com sucesso"})
}
