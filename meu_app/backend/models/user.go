package models

import (
	"time"
	"gorm.io/gorm"
)

type PlanType string

const (
	PlanFree  PlanType = "FREE"
	PlanTrial PlanType = "TRIAL"
	PlanPro   PlanType = "PRO"
)

type User struct {
	gorm.Model
	DeviceID    string    `gorm:"uniqueIndex;not null" json:"device_id"`
	Plan        PlanType  `gorm:"default:'FREE'" json:"plan"`
	TrialEndsAt time.Time `json:"trial_ends_at"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
}

// IsTrialActive checks if the user is on an active trial
func (u *User) IsTrialActive() bool {
	return u.Plan == PlanTrial && time.Now().Before(u.TrialEndsAt)
}
