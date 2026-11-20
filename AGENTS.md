# AGENTS.md

## Обзор проекта

**Stellode** — приложение для аналитики и визуализации зависимостей между услугами, функционалами, командами, компонентами и приложениями. Расширяет идею C4-диаграмм контекстами (Unit, Service, Feature, Team, Component), версионированием и анализом влияния изменений.

Название: *stella* (звезда) + *node* (нода) — «созвездие нод»: карта связанных сущностей и зависимостей.

Ядром системы является построение связей между имплементациями бизнес-компонентов, чтобы отобразить иметь понимание какие системы потребуют изменений при доработке текущей.

## Стек технологий

- **Монорепо**: Nx 22, npm workspaces
- **Backend**: NestJS 11, TypeScript 5.9
- **Графовая БД**: Neo4j 5 (Bolt, язык запросов Cypher, драйвер `neo4j-driver`)
- **Frontend**: React 19, Vite 7, React Router 7, Ant Design, @xyflow/react, elkjs (ELK layered)
- **Тесты**: Jest 29
- **Линтинг**: ESLint, Prettier
- **Инфраструктура**: Docker Compose

Neo4j используется для бизнес-сущностей (граф зависимостей).

## Структура проекта

```
apps/
  backend/          — NestJS API (порт 3000, префикс /api)
    src/
      app/          — корневой модуль (композиция импортов)
      diagram/      — диаграммы: DiagramController, DiagramService, модели графа для диаграмм
      neo4j/        — подключение к Neo4j (Bolt), Neo4jService, neo4j-schema.service
      unit/         — CRUD юнитов
      team/         — CRUD команд
      application/  — CRUD приложений
      service/      — CRUD услуг
      feature/      — CRUD функционалов
      component/    — CRUD компонентов
      edge/         — управление связями графа
      impact/       — анализ влияния изменений
      *-version/    — версионирование сущностей (feature-version, application-version, component-version)
  frontend/         — React SPA
    src/
      App.tsx       — корень SPA (BrowserRouter, навигация)
      AppRoutes.tsx — дерево маршрутов React Router (`Routes` / `Route`)
      pages/        — страницы по доменным сущностям + diagrams/
      common/       — локальные переиспользуемые части (при необходимости)
      context/      — React-контексты (UnitContext)
      const.ts      — `API_BASE` (переменная `VITE_API_BASE`, см. корневой `.env.example`)
libs/
  models/           — общие TypeScript-типы/модели для backend+frontend
docs/
  frontend/ui-spec.md     — спецификация UI/UX (экраны, сценарии, рекомендации)
  diagrams-api.md         — эндпоинты ArchitectureGraph (cross-unit, unit, компонент)
scripts/            — db-clear / db-seed / db-reset (Cypher в scripts/cypher/, раннеры через neo4j-driver)
```

### Models (`libs/models`)

- **Назначение**: общий контракт типов между `apps/backend` и `apps/frontend`. Фронтенд **не** должен импортировать типы напрямую из `apps/backend/src`.
- **Импорт**: `@stellode/models`.
- **Сборка**: после изменений в `libs/models/src` обязательно `npx nx run models:build` (иначе `dist/libs/models` устаревает и backend/frontend падают на типах). См. skill `.cursor/skills/build-models-after-change`.
- **Что экспортируется (основное)**:
  - `ArchitectureGraph`, `Node`, `Relationship*`, `Label`
  - `ViewNode`, `ViewEdge`, `Diagram`
  - `VersionStatus`, `parseVersionStatus`, `allowedTargets`
  - `GraphProjection`, `ImpactQueryMode`
- **Важно про `VersionStatus` / `GraphProjection`**: реализованы как `as const`, а не `enum`, чтобы корректно работать с настройками фронтенда (например `erasableSyntaxOnly`).

## Запуск проекта

```bash
npm run docker:up     # Neo4j
npm run b             # backend (nx serve backend)
npm run f             # frontend (nx serve frontend → Vite)
```

## Архитектурные правила

### Backend

- Каждая доменная сущность — отдельный NestJS-модуль: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Контроллер делегирует логику сервису, не содержит бизнес-логики.
- Данные графа (связи, диаграммы, версии, impact) — Neo4j через `Neo4jService.read()` / `.write()` с параметризованными Cypher-запросами.
- Глобальный префикс API: `/api`.
- Swagger (OpenAPI, `@nestjs/swagger`): UI — `/api/docs`, JSON — `/api/docs-json`; описание эндпоинтов размечается декораторами в контроллерах (`@ApiTags`, `@ApiOperation`, ...), настройка — `common/setup-swagger.ts`.
- ID сущностей — UUID.
- Lifecycle-автоматизация (`FeatureVersion.readyToProduction` и auto-active) построена на in-process событиях NestJS через `@nestjs/event-emitter` (событие смены статуса `ComponentVersion`, эмитится после релиза/отката приложения при пересчёте глобального статуса).
- Прикладной статус версии компонента в релизе хранится на ребре `HAS_COMPONENT.status`; глобальный `ComponentVersion.status` производный (spec §3.0.1). Функционал привязывается к приложению через `USES_COMPONENT_VERSION.applicationId` (spec §6).
- Ручной пересчёт готовности функционала: `POST /api/feature-versions/check-ready` — ответ `CheckFeatureVersionReadyResult` (`readyToProduction` + `bindings[]` + `crossUnitBindings[]`); `readyToProduction` учитывает исходящие cross-unit `DEPENDS_ON` (spec §6); см. [docs/api.md](docs/api.md).
- Impact API: `GET /api/impact/{unit|team|service|feature|application|component|component-version}/:id` (описание — в Swagger, тег `impact`).
- Состав услуги (`AGGREGATES`): `POST /api/services/:id/aggregates`, `POST /api/services/:id/aggregates/remove` (см. `docs/aggregates-api.md`). Архивация услуги (без удаления ноды): `POST /api/services/:id/archive`; у архивной услуги мутации состава и описания запрещены. Возврат из архива: `POST /api/services/:id/unarchive` (снова `status: active`, идемпотентно если уже активен).
- Диаграммы: `GET /api/diagrams/cross-unit?centerUnitId=<uuid>`, `GET /api/diagrams/unit/:id` и остальные пути в модуле `diagram` / `DiagramController` (см. `docs/diagrams-api.md`); компонент по id: `GET /api/components/:id`. Диаграмма услуги (прод-состав): `GET /api/diagrams/service/:id`; расширение по `DEPENDS_ON`: `GET /api/diagrams/service/:id/integrations`. На фронте SPA: `/services/:id/diagram` (draft — query `?projection=draft`, см. `docs/aggregates-api.md`).

### Frontend

- Функциональные компоненты React, без классов.
- Страницы в `pages/<entity>/` — один файл на страницу + CSS-модуль.
- HTTP-запросы через `axios`, базовый URL из `const.ts` / `VITE_API_BASE` (см. [`.env.example`](.env.example)).
- Диаграммы через `@xyflow/react` с кастомными нодами и асинхронной ELK-раскладкой (`elkjs`); компоненты группируются внутри контейнеров `Application` (subflow, нода `group`); обзорные vs версионные режимы, impact и cross-unit drill-down — см. **[docs/diagrams-frontend.md](docs/diagrams-frontend.md)**.
- UI: компоненты **[Ant Design](https://ant.design/)** (`antd`); поведение экранов и сценариев — **[docs/frontend/ui-spec.md](docs/frontend/ui-spec.md)**. Подписи сущностей в UI: Unit → Юнит, Service → Услуга, Feature → Фича; cross-unit → «Пересечение юнитов».
- Маршруты приложения (`/`, `/units/:id/diagram`, `/units/:id/diagram/cross-unit`, `/applications/:id/release` и др.) — см. **[docs/frontend/frontend-routes.md](docs/frontend/frontend-routes.md)** и [ui-spec.md §1](docs/frontend/ui-spec.md); реализация объявленных путей — в `apps/frontend/src/AppRoutes.tsx`.



## Полная нормативная модель (сущности, рёбра в `SNAKE_CASE`, state machine, `DEPENDS_ON` и контекст на рёбрах) — **[docs/spec.md](docs/spec.md)**.

Каноническая модель графа описана в `docs/spec.md`.

## Тестирование

- Jest 29 + ts-jest, конфигурация через Nx.
- **Backend unit:** `nx run backend:test` или с покрытием и порогом: `nx run backend:test --configuration=ci`.
- **Integration (Neo4j, запланировано):** `nx run backend:integration-test` (нужен Docker; слой пока не реализован).
- **models:** `nx run models:test`.
- **frontend:** `nx run frontend:test`.

## Инфраструктура

- Переменные окружения для локальной разработки: корневой [`.env.example`](.env.example) (скопировать в `.env`).
- Docker Compose: Neo4j 5 (Bolt — порт 7687, браузер — 7474), переменные `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`.
- Демо-данные: `npm run db:reset` (очистка + seed) или `npm run db:seed` / `npm run db:clear`; Cypher — `scripts/cypher/`, раннеры — `scripts/db-*.mjs` через `neo4j-driver`. Алиас: `npm run seed:demo` → `db:seed`. Острова: `CoolUnit` (Notifications: SendEmail + SendNotificationInApp) и `CoolUnit2` (SendEmail provider, cross-unit `DEPENDS_ON`). Переэкспорт из живой БД: `node scripts/db-export-units-seed.mjs CoolUnit CoolUnit2` (перед записью копирует текущий seed в `scripts/cypher/seed.cypher.bak`).

### Что запрещено

1. Перед созданием нового функционала, проверь, нет ли уже такого, для реиспользования.
