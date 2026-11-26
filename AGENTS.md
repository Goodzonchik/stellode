# AGENTS.md

## Обзор проекта

**Stellode** — приложение для аналитики и визуализации зависимостей между услугами, функционалами, командами, компонентами и приложениями. Расширяет идею C4-диаграмм контекстами (Unit, Service, Feature, Team, Component), версионированием и анализом влияния изменений.

Название: *stella* (звезда) + *node* (нода) — «созвездие нод»: карта связанных сущностей и зависимостей.

Ядро системы — связи между имплементациями бизнес-компонентов, чтобы понимать, какие системы затронет доработка.

## Стек технологий

- **Монорепо**: Nx 22, npm workspaces
- **Backend**: NestJS 11, TypeScript 5.9
- **Графовая БД**: Neo4j 5 (Bolt, Cypher, `neo4j-driver`)
- **Frontend**: React 19, Vite 7, React Router 7, Ant Design, @xyflow/react, elkjs
- **Тесты**: Jest 29
- **Инфраструктура**: Docker Compose

## Структура проекта

```
apps/
  backend/   — NestJS API (порт 3000, префикс /api)
  frontend/  — React SPA
libs/
  models/    — общие TypeScript-типы (`@stellode/models`)
docs/        — спецификация, API, UI, справка
scripts/     — db-clear / db-seed / db-reset
```

После изменений в `libs/models/src` обязательно: `npx nx run models:build`.

## Запуск проекта

```bash
cp .env.example .env   # при необходимости
npm run docker:up      # Neo4j
npm run b              # backend
npm run f              # frontend
npm run db:reset       # опционально: очистка + демо-seed
```

Подробности — в [`CONTRIBUTING.md`](CONTRIBUTING.md) и [`.env.example`](.env.example).

## Документация

- [`docs/index.md`](docs/index.md) — входная точка
- [`docs/spec.md`](docs/spec.md) — каноническая модель графа
- [`docs/api.md`](docs/api.md) — API
- [`docs/diagrams-api.md`](docs/diagrams-api.md) — эндпоинты диаграмм
- [`docs/aggregates-api.md`](docs/aggregates-api.md) — состав услуги (`AGGREGATES`)
- [`docs/diagrams-frontend.md`](docs/diagrams-frontend.md) — диаграммы на фронте
- [`docs/frontend/ui-spec.md`](docs/frontend/ui-spec.md) — UI/UX
- [`docs/frontend/frontend-routes.md`](docs/frontend/frontend-routes.md) — маршруты SPA

## Правила

1. Перед созданием нового функционала проверь, нет ли уже такого, для переиспользования.
