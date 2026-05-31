COMPOSE_FILE := docker-compose.yaml
SERVICE := api
REDIS_SERVICE := redis
PERF_TARGET ?= http://localhost:3000
SEARCH_URL := $(PERF_TARGET)/repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=0

.PHONY: help setup install audit build test coverage integration complete-integration performance-warmup performance complete-performance dev start up down restart clean

help:
	@echo "Available commands:"
	@echo "  make setup       Install dependencies and build TypeScript"
	@echo "  make install     Install npm dependencies"
	@echo "  make audit       Run npm security audit"
	@echo "  make build       Build TypeScript"
	@echo "  make test        Run tests"
	@echo "  make coverage    Run tests with coverage"
	@echo "  make integration Run HTTP integration tests"
	@echo "  make complete-integration Run Docker services, integration tests, and shutdown"
	@echo "  make performance Run cached Artillery performance test"
	@echo "  make complete-performance Run Docker services, performance test, and shutdown"
	@echo "  make dev         Run local dev server"
	@echo "  make start       Run built app locally"
	@echo "  make up          Start Docker services"
	@echo "  make down        Stop Docker services"
	@echo "  make restart     Restart Docker services"
	@echo "  make clean       Remove local build output"

install:
	npm install

audit:
	npm audit

setup:
	$(MAKE) install
	$(MAKE) build

build:
	npm run build

test:
	npm test

coverage:
	npm run test:coverage

integration:
	npm run test:integration

complete-integration:
	$(MAKE) up
	$(MAKE) integration; status=$$?; $(MAKE) down; exit $$status

performance-warmup:
	curl -fsS "$(PERF_TARGET)/health" > /dev/null
	curl -fsS "$(SEARCH_URL)" > /dev/null

performance:
	$(MAKE) performance-warmup
	npm run performance -- --target "$(PERF_TARGET)"

complete-performance:
	$(MAKE) up
	$(MAKE) performance; status=$$?; $(MAKE) down; exit $$status

dev:
	npm run dev

start:
	npm start

up:
	docker compose -f $(COMPOSE_FILE) up -d --build --wait --wait-timeout 120

down:
	docker compose -f $(COMPOSE_FILE) down

restart:
	$(MAKE) down
	$(MAKE) up
