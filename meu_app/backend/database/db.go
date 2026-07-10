package database

import (
	"log"
	"safevault-backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var err error
	DB, err = gorm.Open(sqlite.Open("safevault.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Falha ao conectar ao banco de dados: %v", err)
	}

	log.Println("Conectado ao SQLite com sucesso!")

	// Executa as migrações (Cria as tabelas se não existirem)
	err = DB.AutoMigrate(&models.User{}, &models.CloudFile{}, &models.SecureLink{})
	if err != nil {
		log.Fatalf("Erro na migração: %v", err)
	}
	log.Println("Migrações concluídas.")
}
