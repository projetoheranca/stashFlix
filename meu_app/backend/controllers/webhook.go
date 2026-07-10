package controllers

import (
	"log"
	"net/http"
	"safevault-backend/database"
	"safevault-backend/models"

	"github.com/gin-gonic/gin"
)

type RevenueCatWebhook struct {
	Event struct {
		Type        string `json:"type"` // e.g., INITIAL_PURCHASE, RENEWAL, CANCELLATION
		AppUserID   string `json:"app_user_id"` // This maps to our DeviceID for now
		Entitlement string `json:"entitlement_id"` // e.g., "pro"
	} `json:"event"`
}

// HandleRevenueCatWebhook processes subscription events from Apple/Google via RevenueCat
func HandleRevenueCatWebhook(c *gin.Context) {
	var payload RevenueCatWebhook
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload inválido"})
		return
	}

	deviceID := payload.Event.AppUserID
	eventType := payload.Event.Type

	log.Printf("Webhook Recebido: Tipo=%s, Usuario=%s", eventType, deviceID)

	var user models.User
	if err := database.DB.Where("device_id = ?", deviceID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado no banco de dados"})
		return
	}

	switch eventType {
	case "INITIAL_PURCHASE", "RENEWAL":
		user.Plan = models.PlanPro
		log.Println("Usuário promovido para PRO via Webhook!")
	case "CANCELLATION", "EXPIRATION":
		user.Plan = models.PlanFree
		log.Println("Assinatura cancelada/expirada. Usuário rebaixado para FREE.")
	}

	database.DB.Save(&user)
	c.JSON(http.StatusOK, gin.H{"status": "Webhook processado com sucesso"})
}
