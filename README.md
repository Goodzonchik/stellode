# Stellode

**Stellode** = *stella* (звезда) + *node* (нода) — «созвездие нод».

Приложение для аналитики и визуализации зависимостей между услугами, фичами, командами, компонентами и приложениями.

Пользовательская справка — в SPA (`/help`, раздел «О продукте»). Документация модели и API — в [`docs/index.md`](docs/index.md).

## Стек

- Монорепо: Nx, npm workspaces
- Backend: NestJS, TypeScript
- Графовая БД: Neo4j 5 (Bolt)
- Frontend: React, Vite, React Router, Ant Design, @xyflow/react, elkjs
- Тесты: Jest

## Требования

- Node.js и npm
- Docker (для Neo4j через Compose)

Переменные окружения: скопируйте `.env.example` в `.env` (см. также [`CONTRIBUTING.md`](CONTRIBUTING.md)). По умолчанию Neo4j: `bolt://localhost:7687`, пользователь `neo4j`, пароль `stellode` (`NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`). Frontend: `VITE_API_BASE`.

## Быстрый старт

```bash
npm install
npm run docker:up
npm run b          # API :3000, префикс /api
npm run f          # Vite frontend
npm run db:reset   # очистка + демо-seed
```

Swagger: `http://localhost:3000/api/docs`.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run b` | backend (`nx serve backend`) |
| `npm run f` | frontend (`nx serve frontend`) |
| `npm run docker:up` / `docker:down` | поднять / остановить Neo4j |
| `npm run db:reset` | очистка + seed |
| `npm run db:seed` / `db:clear` | только seed / только очистка |
| `npm test` | тесты backend, models, frontend |
| `npm run test:ci` | тесты с CI-конфигурацией |
| `npm run format` / `format:check` | Prettier |

После изменений в `libs/models` выполните `npx nx run models:build`.

## Структура

```
apps/backend/     — NestJS API
apps/frontend/    — React SPA
libs/models/      — общие TypeScript-типы (@stellode/models)
docs/             — спецификация и API
scripts/          — db-clear / db-seed / db-reset (Cypher)
```

## Документация

- [`docs/index.md`](docs/index.md) — вход в документацию
- [`AGENTS.md`](AGENTS.md) — обзор для агентов и архитектура
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — процесс контрибуции
- Справка в приложении: меню «Справка» → `/help`
