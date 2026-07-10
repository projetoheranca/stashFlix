package controllers

import (
	"net/http"
	"safevault-backend/database"
	"safevault-backend/models"

	"github.com/gin-gonic/gin"
)

func GetAdminStats(c *gin.Context) {
	var totalUsers int64
	var proUsers int64
	var totalFiles int64
	
	// Fast counting using GORM
	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("plan = ?", models.PlanPro).Count(&proUsers)
	database.DB.Model(&models.CloudFile{}).Count(&totalFiles)

	// Calculate total storage used in bytes
	type Result struct {
		TotalSize int64
	}
	var res Result
	database.DB.Model(&models.CloudFile{}).Select("sum(file_size) as total_size").Scan(&res)

	// Convert bytes to Megabytes for display
	storageMB := float64(res.TotalSize) / 1024 / 1024

	c.JSON(http.StatusOK, gin.H{
		"total_users":       totalUsers,
		"pro_users":         proUsers,
		"total_files":       totalFiles,
		"storage_used_mb":   storageMB,
		"server_status":     "Online",
	})
}
