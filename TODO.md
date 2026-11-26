# TODO

## Code simplification (ревью 2026-03-26)

Цель: убрать неоправданную сложность без смены публичных API и доменных правил из `docs/spec.md`.

### P0 — корректность / надёжность

- [ ] **Атомарный release приложения**
  - Файл: `apps/backend/src/application-version/application-version.service.ts` (`release` ~571–742)
  - Проблема: цикл отдельных `neo4j.write` на `HAS_COMPONENT` / `publishDraftOnRelease` → частичный релиз при сбое
  - Решение: расширить `Neo4jService` методом `writeInTransaction` (несколько `tx.run` в одном `executeWrite`) и выполнить release/revert атомарно
  - Риск: средний; нужны integration-тесты

- [ ] **Ошибки диаграмм → HTTP-ошибка, не 200 `{ message }`**
  - Файл: `apps/backend/src/diagram/diagram.service.ts`
  - Проблема: catch → `{ message: 'Error fetching…' }` + `console.error`; фронт ждёт `ArchitectureGraph`
  - Решение: `throw` / 503 через `HttpExceptionFilter`; проверить UX на фронте
  - Риск: средний (контракт API)

- [ ] **Убрать маппинг ошибок по подстрокам в FV controller**
  - Файл: `apps/backend/src/feature-version/feature-version.controller.ts` (~92–107, 143–155)
  - Проблема: `error.message.includes(hint)` определяет 400 vs 500
  - Решение: бросать `BadRequestException` / `NotFoundException` в сервисе; контроллер тонкий
  - Риск: низкий

- [ ] **Унифицировать `mergeArchitectureGraphs`**
  - BE: `apps/backend/src/diagram/models/merge-architecture-graph.ts` (побеждает 2-й аргумент)
  - FE: `apps/frontend/src/pages/diagrams/merge-architecture-graphs.ts` (побеждает 1-й)
  - Решение: одна функция в `libs/models` с явным правилом коллизий + общий тест; обновить вызовы
  - Риск: низкий–средний

### P1 — архитектура / поддерживаемость

- [ ] **Разрезать god-services без смены HTTP API**
  - `feature-version.service.ts` (~1320) → lifecycle / bindings / depends-on
  - `application-version.service.ts` (~1120) → release / composition / preview
  - `diagram.service.ts` (~1090) → общие Cypher-фрагменты + методы по типам диаграмм
  - Риск: средний; опираться на существующие spec-тесты

- [ ] **Декомпозиция `Diagrams.tsx` (~1794)**
  - Хуки: `useDiagramLoad`, `useDiagramFilters`, `useDiagramModals`; тонкий presentational shell
  - Риск: средний

- [ ] **Общие правила DEPENDS_ON status warnings**
  - Дубли: `impact.service.ts` `isStatusWarningPair`, `diagram-production-overlays.ts`, `edge-context-validation.ts` `buildDependsOnStatusWarnings`
  - Решение: один модуль правил в `libs/models` (или `common/depends-on-status-rules`)
  - Риск: низкий

- [ ] **Явный контракт `checkReadyToProduction`**
  - Сейчас вызывает `autoActivateIfReady` → может `publish` (side effect при «проверке»)
  - Решение: разделить check и auto-publish **или** явно задокументировать/переименовать поведение
  - Риск: средний (поведение UX)

- [ ] **Консолидация DEPENDS_ON-диалогов**
  - `CreateDependsOnDialog`, `CrossUnitDependsOnDialog`, `AddFeatureDependsOnDialog`
  - Общий `useUnitCatalog` / wizard-скелет cascade unit→service→feature→FV
  - Риск: средний–высокий


### P3 — косметика / отложить

- [ ] Swagger codegen (~71 класс) — отложить, ROI низкий
- [ ] TanStack Query на весь FE — отложить (смена парадигмы)

### Порядок первых PR

1. P0 #1–#4
2. P1 status-rules + `isApplicationComponentStatus`
3. Хуки из `Diagrams.tsx`
4. Разрез god-services по сценариям

### Не трогать без нужды

- Тонкий `Neo4jService` (кроме добавления транзакций)
- `architecture-graph-to-diagram`, чистые layout/project-функции диаграмм
- Производный статус CV (`allowedTargets` пустой) — осознанный домен из spec

---

## Идеи (продукт)

1. Реализовать запросы на "плохие" связи, как в процессе, так и после
2. Диалоговое окно удаления сущности + проверка на наличие исходящих связей. Нельзя удалить ноды, если они имеют исходящие связи. Уточнить где и какие.
3. В будущем, добавить дополнительные галочки на диаграмму услуг (продумать что должно быть на диаграмме): "отображать связи между фичами" + "отображать связи с фичами из внешнего тенанта"
4. При новом релизе посмотреть какие компоненты добавлены в фичах и вывести их как список правок, чтобы не добавлять вручную
5. Сделать пример, когда одна фича связывается с другой в рамках одного тенанта, одного юнита, одной или двух разных услуг

