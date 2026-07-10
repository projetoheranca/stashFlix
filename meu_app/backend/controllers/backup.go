package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"safevault-backend/database"
	"safevault-backend/models"

	"github.com/gin-gonic/gin"
)

// UploadFile handles receiving an encrypted file from the mobile app
func UploadFile(c *gin.Context) {
	deviceID := c.PostForm("device_id")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DeviceID é obrigatório"})
		return
	}

	// Validate User and Plan
	var user models.User
	if err := database.DB.Where("device_id = ?", deviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autorizado"})
		return
	}

	if user.Plan == models.PlanFree {
		c.JSON(http.StatusForbidden, gin.H{"error": "Backup em nuvem requer Plano PRO ou Trial"})
		return
	}

	// Receber arquivo
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo não enviado"})
		return
	}

	// Criar diretório seguro se não existir
	storagePath := "./storage/" + deviceID
	if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar diretório de storage"})
		return
	}

	// Salvar arquivo fisicamente
	filename := filepath.Base(file.Filename)
	filePath := fmt.Sprintf("%s/%s", storagePath, filename)
	
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao salvar o arquivo"})
		return
	}

	// Registrar no Banco de Dados
	cloudFile := models.CloudFile{
		DeviceID: deviceID,
		FileName: filename,
		FileSize: file.Size,
		FileURL:  fmt.Sprintf("/storage/%s/%s", deviceID, filename),
	}
	database.DB.Create(&cloudFile)

	c.JSON(http.StatusOK, gin.H{
		"message": "Upload concluído com sucesso!",
		"file":    cloudFile,
	})
}

// ListFiles returns all uploaded files for the device
func ListFiles(c *gin.Context) {
	deviceID := c.Param("device_id")
	
	var user models.User
	if err := database.DB.Where("device_id = ?", deviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autorizado"})
		return
	}

	var files []models.CloudFile
	database.DB.Where("device_id = ?", deviceID).Find(&files)

	c.JSON(http.StatusOK, gin.H{"files": files})
}
