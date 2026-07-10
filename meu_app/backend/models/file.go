package models

import (
	"gorm.io/gorm"
)

type CloudFile struct {
	gorm.Model
	DeviceID string `gorm:"index;not null" json:"device_id"`
	FileName string `gorm:"not null" json:"file_name"`
	FileSize int64  `json:"file_size"`
	FileURL  string `gorm:"not null" json:"file_url"`
}
