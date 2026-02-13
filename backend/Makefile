.PHONY: help build up down logs shell db-shell migrate migrate-create test clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build Docker images
	docker-compose build

up: ## Start all services in detached mode
	docker-compose up -d

down: ## Stop and remove all containers
	docker-compose down

logs: ## Show logs from all services
	docker-compose logs -f

shell: ## Open a shell in the API container
	docker-compose exec api /bin/bash

db-shell: ## Open PostgreSQL shell
	docker-compose exec db psql -U wealthos -d wealthos

migrate: ## Run database migrations
	docker-compose exec api alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="description")
	docker-compose exec api alembic revision --autogenerate -m "$(MSG)"

test: ## Run tests
	docker-compose exec api pytest

clean: ## Stop containers and remove volumes (WARNING: deletes all data)
	docker-compose down -v

restart: down up ## Restart all services

dev: ## Start services and show logs
	docker-compose up

rebuild: down build up ## Rebuild and restart all services
