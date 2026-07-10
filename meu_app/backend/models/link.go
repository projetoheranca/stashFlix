package models

import "time"

// SecureLink representa um link de visualização única (Snapchat style)
type SecureLink struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Token     string    `gorm:"uniqueIndex" json:"token"`
	DeviceID  string    `json:"device_id"`
	FilePath  string    `json:"file_path"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}
