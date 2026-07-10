package controllers

import (
	"net/http"
	"safevault-backend/database"
	"safevault-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

type RegisterRequest struct {
	DeviceID string `json:"device_id" binding:"required"`
}

// Register or get the user by DeviceID
func RegisterDevice(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DeviceID é obrigatório"})
		return
	}

	var user models.User
	result := database.DB.Where("device_id = ?", req.DeviceID).First(&user)

	if result.Error != nil {
		// New User
		user = models.User{
			DeviceID: req.DeviceID,
			Plan:     models.PlanFree,
		}
		database.DB.Create(&user)
	}

	// Update trial status if trial expired
	if user.Plan == models.PlanTrial && !user.IsTrialActive() {
		user.Plan = models.PlanFree
		database.DB.Save(&user)
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// Start 7-Day Free Trial
func StartTrial(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DeviceID é obrigatório"})
		return
	}

	var user models.User
	if err := database.DB.Where("device_id = ?", req.DeviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}

	if user.Plan == models.PlanPro {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Você já possui o plano PRO"})
		return
	}

	if !user.TrialEndsAt.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Você já utilizou o seu período de teste"})
		return
	}

	// Set trial for 7 days
	user.Plan = models.PlanTrial
	user.TrialEndsAt = time.Now().AddDate(0, 0, 7)
	database.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "Período de teste de 7 dias iniciado com sucesso!", "user": user})
}

// Upgrade to Pro (Simulated)
func UpgradeToPro(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DeviceID é obrigatório"})
		return
	}

	var user models.User
	if err := database.DB.Where("device_id = ?", req.DeviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}

	user.Plan = models.PlanPro
	database.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "Bem-vindo ao plano PRO VIP!", "user": user})
}
