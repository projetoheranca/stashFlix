package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"safevault-backend/database"
	"safevault-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

func generateSecureToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// GenerateSecureLink cria um link de visualização única
func GenerateSecureLink(c *gin.Context) {
	deviceID := c.PostForm("device_id")
	filePath := c.PostForm("file_path")

	if deviceID == "" || filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parâmetros inválidos"})
		return
	}

	token := generateSecureToken()
	link := models.SecureLink{
		Token:     token,
		DeviceID:  deviceID,
		FilePath:  filePath,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute), // Expira em 5 minutos
	}

	if err := database.DB.Create(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"shareable_url": fmt.Sprintf("http://localhost:8080/api/links/view/%s", token),
		"expires_in":    "5 minutes",
	})
}

// ViewSecureLink visualiza e destrói o link
func ViewSecureLink(c *gin.Context) {
	token := c.Param("token")

	var link models.SecureLink
	if err := database.DB.Where("token = ?", token).First(&link).Error; err != nil {
		c.String(http.StatusNotFound, "Este link não existe ou já foi destruído.")
		return
	}

	if time.Now().After(link.ExpiresAt) {
		database.DB.Delete(&link)
		c.String(http.StatusGone, "Este link expirou.")
		return
	}

	// 1. Em um cenário real, nós faríamos proxy da imagem encriptada aqui
	// 2. Imediatamente após servir, nós apagamos para garantir a "Visualização Única"
	database.DB.Delete(&link)

	c.String(http.StatusOK, fmt.Sprintf("🔒 VISUALIZAÇÃO ÚNICA: Exibindo arquivo %s. Este link acabou de ser destruído.", link.FilePath))
}
