COMPOSE_FILE := docker-compose.yaml
SERVICE := api
REDIS_SERVICE := redis
SEARCH_URL := http://localhost:3000/repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=0

.PHONY: help install build test test-integration dev start up down restart clean

help:
	@echo "Available commands:"
	@echo "  make install     Install npm dependencies"
	@echo "  make build       Build TypeScript"
	@echo "  make test        Run tests"
	@echo "  make test-integration  Run HTTP integration tests"
	@echo "  make dev         Run local dev server"
	@echo "  make start       Run built app locally"
	@echo "  make up          Start Docker services"
	@echo "  make down        Stop Docker services"
	@echo "  make restart     Restart Docker services"
	@echo "  make clean       Remove local build output"

install:
	npm install

build:
	npm run build

test:
	npm test

test-integration:
	npm run test:integration

dev:
	npm run dev

start:
	npm start

up:
	docker compose -f $(COMPOSE_FILE) up

down:
	docker compose -f $(COMPOSE_FILE) down

restart:
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(COMPOSE_FILE) up --build
