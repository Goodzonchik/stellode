# API диаграмм (ArchitectureGraph)

Эндпоинты возвращают объект **`ArchitectureGraph`** из `@stellode/models`: `nodes[]`, `relationships[]`. Преобразование в React Flow выполняется на фронтенде ([`architecture-graph-to-diagram`](../apps/frontend/src/pages/architecture-graph-to-diagram.ts) и аналогичная цепочка).

Глобальный префикс: **`/api`**.

**Порядок маршрутов NestJS:** в `DiagramController` более специфичные пути объявляются **раньше** параметризованных (например `service/:id/integrations` до `service/:id`, `cross-unit/bridge/…` до `cross-unit`), иначе сегмент перехватит `:id`.

## `GET /api/diagrams/cross-unit/bridge/:unitIdA/:unitIdB`

Детализация **одного моста** между двумя юнитами ([ui-spec §5.5](./frontend/ui-spec.md), drill-down на фронте):

- **Назначение**: подграф зависимостей `DEPENDS_ON` между `ComponentVersion`, где потребитель и поставщик лежат в разных юнитах из пары `{unitIdA, unitIdB}`, с правилом публичности **компонента-поставщика** (`Component.isPublic`; в реализации может читаться как свойство родителя узла поставщика, нормативно — [spec §8](./spec.md)), плюс контекст вокруг затронутых версий: `Unit`, `Team` (`MAINTAINS`, `HAS_TEAM`), `Component` (`HAS_VERSION` / `HAS_DRAFT`), `Feature` / `FeatureVersion` (`USES_COMPONENT_VERSION`), `Service` (`PROVIDES` Unit→Service, `AGGREGATES`) / `Application` / `ApplicationVersion` (цепочки `HAS_VERSION`, `HAS_COMPONENT`; активные `AGGREGATES` без `deleted: true`).
- **Ответ**: тот же формат `ArchitectureGraph`, что и у остальных диаграмм; раскладка слоями на бэкенде — как у unit-диаграммы (`orientGraphByLayerOrder` с `DIAGRAM_LAYER_ORDERS.unit`). Контракт ответа **без изменений** для контейнеров Unit: вложенность `Unit` → Team/Service/Feature/Application → Component — только SPA-проекция ([ui-spec §5.5](./frontend/ui-spec.md), [diagrams-frontend.md](./diagrams-frontend.md)).

Идентификаторы юнитов в пути — URL-encoded UUID (как в синтетическом ребре `CROSS_UNIT_LINK:…`).

## `GET /api/diagrams/cross-unit`

Обзорная cross-unit диаграмма **относительно центрального юнита** ([ui-spec §5.5](./frontend/ui-spec.md)):

- **Query-параметр (обязательный)**: `centerUnitId` — UUID юнита. Без параметра ответ **400**. Если юнита с таким `id` нет — **400** с сообщением об отсутствии юнита.
- **Ноды**: `Unit` с `id = centerUnitId` и только те **соседние** юниты, с которыми есть хотя бы одно cross-unit ребро `DEPENDS_ON` между `ComponentVersion` (разные `unitId`, у **компонента-поставщика** `Component.isPublic = true` по [spec §8](./spec.md)).
- **Мосты**: синтетические рёбра **`CROSS_UNIT_LINK`** только между **центром и каждым соседом** (звезда). Мосты «сосед — сосед» без участия центра **не** возвращаются.

Правила видимости cross-unit совпадают с impact (spec §8, Swagger `impact`): при направлении «потребитель → поставщик» зависимость на чужой юнит учитывается только если у **компонента-поставщика** `Component.isPublic = true`.

Идентификатор синтетического ребра: `CROSS_UNIT_LINK:{centerUnitId}:{peerUnitId}` (центр всегда первый сегмент после префикса).

В графе рёбер `Unit → Unit` нет; `CROSS_UNIT_LINK` — только проекция для UI.

## `GET /api/diagrams/unit/:id`

Диаграмма юнита ([ui-spec §5.3](./frontend/ui-spec.md), [spec §1.1](./spec.md)): организационный hub от ноды `Unit` плюс состав `current`-релизов приложений юнита для контейнеров Application на SPA:

- Нода `Unit` **возвращается** в ответе (имя для заголовка `Юнит {name}` на SPA); на холсте unit-диаграммы **не** рисуется ([diagrams-frontend.md](./diagrams-frontend.md)).
- `HAS_TEAM` → `Team`
- `Team -[:MAINTAINS]-> Component` — **только** компоненты, входящие в `current`-состав приложений юнита (`HAS_COMPONENT.status ∈ {active, deprecated}`); draft-only / unactive-only / вне состава юнита **не** возвращаются.
- `PROVIDES` → `Service`
- `Service -[:AGGREGATES]-> Feature` (только активные рёбра, без `deleted: true`)
- `OWNS` → `Application` — **только** приложения с `ApplicationVersion(current)` и **непустым** составом `HAS_COMPONENT` (`status ∈ {active, deprecated}`); ребро **возвращается** в ответе; на холсте SPA **не** рисуется. Приложения без релизов / без `current` / с пустым `current` **не** входят.
- Для Feature из активных `AGGREGATES`: `FeatureVersion` со статусом **`draft`**, **`active`** или **`deprecated`** + рёбра `HAS_VERSION` / `HAS_DRAFT`; рёбра **`USES_COMPONENT_VERSION`** (свойство `applicationId`) на `ComponentVersion` со статусом **`active`** / **`deprecated`**, чей родительский `Component` в `MAINTAINS` команд юнита **и** CV входит в `current`-состав приложения юнита с `HAS_COMPONENT.status ∈ {active, deprecated}`. Чужие Feature / Component по `USES` **не** дотягиваются.
- Для таких компонентов состава: ноды `ComponentVersion` (`status ∈ {active, deprecated}`) **с рёбрами** `HAS_VERSION` / `HAS_DRAFT` к родителю `Component` (нужны SPA для обзорной проекции CV→Component и membership), плюс `ApplicationVersion {status: current}`, рёбра `HAS_COMPONENT` (свойство `status` — `active` | `deprecated`) и `HAS_VERSION` Application→AV.

Ребро **`STAKEHOLDER`** (`Unit → Feature`) в ответ **не** входит; фичи без активного `AGGREGATES` на hub **не** показываются. Рёбра **`DEPENDS_ON`** в ответ unit-диаграммы **не** входят. Внешний контекст соседей (чужие Application / Feature / Service) **не** подтягивается. Чужие `Unit` **не** входят. Сервисы с **`status = archive`** **не** включаются ([spec §2.1](./spec.md)). Если юнита с `:id` нет — **400** (`Unit not found`). На SPA (dual-filter): нода `Unit` и рёбра `OWNS` / `HAS_COMPONENT` / `HAS_TEAM` / `PROVIDES` от Unit на холсте не рисуются; дополнительно отфильтровываются Application без непустого `current`-состава и Component вне этого состава (плоских у Team нет); CV схлопываются в **обзорный** `Component` (id = Component); виртуальные рёбра `Feature → Component` с лейблом **`USES`** (из `USES_COMPONENT_VERSION`, с учётом `applicationId`); копии Component в нескольких приложениях помечаются `duplicate`.

**Примеры.** Component только `draft` или только `unactive` → в ответе и на холсте нет. Application без `current` или с пустым `current` → нет. Component в `current` приложения юнита → внутри контейнера Application. Component с `active`, но только в чужом приложении → на unit этого юнита нет. Feature F с `active` и `draft` FV, оба `USES` на CV одного Component C в приложении A юнита → одно ребро `F → C` (копия в A), лейбл `USES`, без draft-пометки на ребре. Feature только с одной FV=`draft` → на ноде Feature видна draft-информация; ребро обычное `USES` (если цель в составе). `USES` на Component вне состава юнита → ребра на холсте нет.

Режимы проекции **`on-prod`** / **`draft`** query-параметром **не** задаются для unit-диаграммы. Диаграмма команды — отдельный эндпоинт ниже.

## `GET /api/diagrams/team/:id`

Диаграмма команды ([ui-spec §5.3.1](./frontend/ui-spec.md), [spec §1.1](./spec.md), production-проекция [spec §10](./spec.md)):

- **Старт**: в ответе только нода `Team` с `id = :id`; ребро `HAS_TEAM` и нода `Unit` **не включаются**. Если команды с таким `id` нет — **400** (`Team not found`).
- **Компоненты**: `Team -[:MAINTAINS]-> Component`.
- **Версии компонентов** в подграфе: только `ComponentVersion` со статусом **`active`** или **`deprecated`** (рёбра `HAS_VERSION` / `HAS_DRAFT` от родителя).
- **Фичи**: `Feature` / `FeatureVersion` с `USES_COMPONENT_VERSION` на такие версии компонентов; учитываются только `FeatureVersion` со статусом **`active`** (опубликованная линия).
- **Приложения**: `Application` / `ApplicationVersion` с `HAS_COMPONENT` на такие версии компонентов; учитываются только `ApplicationVersion` со статусом **`current`**.
- **Сервисы**: `Service -[:AGGREGATES]-> Feature` для фич из подграфа, только при **`coalesce(deleted, false) <> true`** на ребре; в **on-prod**-срезе **не** включаются сервисы с **`status = archive`** ([spec §2.1](./spec.md)).
- **`DEPENDS_ON`**: только рёбра, у которых **оба** конца — `ComponentVersion` уже из подграфа команды (внутренние); внешний контекст соседей **не** подтягивается.
- **Не входят в ответ**: произвольные связи Service–Application вне модели [spec §1.1](./spec.md).
- На SPA (как у unit): нода `Team` нужна для заголовка `Команда {name}`; на холсте не рисуется; рёбра `MAINTAINS` на холсте не рисуются ([ui-spec §5.3.1](./frontend/ui-spec.md)).
- Фильтр **«Только код»** на SPA **не** меняет контракт ответа API (скрытие `Service`/`Feature` только на клиенте, [ui-spec §5.3.1](./frontend/ui-spec.md)).

Раскладка слоёв на бэкенде: `orientGraphByLayerOrder` с `DIAGRAM_LAYER_ORDERS.team`.

## `GET /api/diagrams/service/:id`

Диаграмма **состава услуги** (старт от `Service`); срез данных задаётся query **`projection`**:

- **`on-prod`** (по умолчанию): активные `AGGREGATES`, production-подграф (аналог среза диаграммы команды).
- **`draft`**: `?projection=draft` — дополнительно рёбра `AGGREGATES` с **`deleted: true`** и связанные `Feature` только по снятым связям (история состава, [aggregates-api.md](./aggregates-api.md)).

- **Старт**: `Unit -[:PROVIDES]-> Service {id}`. Если пары нет — **400** (`Service not found`).
- **Состав**: активные `AGGREGATES` → `Feature` → `FeatureVersion` (**`active`**) → `USES_COMPONENT_VERSION` → `ComponentVersion` (`active` / `deprecated`) → `Component` / `Team` / `Unit` / `Application` / `ApplicationVersion` по тем же правилам, что у `GET /api/diagrams/team/:id`.
- **Не входят**: рёбра **`DEPENDS_ON`**.

Раскладка: `orientGraphByLayerOrder` с `DIAGRAM_LAYER_ORDERS.team`.

## `GET /api/diagrams/service/:id/integrations`

Расширенная диаграмма: **объединение** графа из `GET /api/diagrams/service/:id` и подграфа по рёбрам **`DEPENDS_ON`**, затрагивающим любую `ComponentVersion` из базового графа:

- Условие на cross-unit: как в [spec §8](./spec.md) — если юниты концов различаются, у **родительского `Component`** узла-поставщика (`prov` в `(cons)-[:DEPENDS_ON]->(prov)`) должно быть `isPublic = true`.
- Контекст вокруг затронутых версий компонентов — по тому же шаблону, что у `GET /api/diagrams/cross-unit/bridge/...` (команды, юниты, фичи, сервисы, приложения); в **`on-prod`** из контекста **исключаются** сервисы с **`status = archive`**, кроме **корневого** сервиса `:id` (прямой просмотр архивной услуги).

## `GET /api/diagrams/feature-version/:id`

Версионная диаграмма **конкретной** `FeatureVersion` ([ui-spec §5.4](./frontend/ui-spec.md)); `:id` — UUID версии функционала.

- Если `FeatureVersion` с таким `id` нет — **400** (`FeatureVersion not found: …`).
- Если у версии нет родительской `Feature` по рёбрам `HAS_VERSION` / `HAS_DRAFT` — **400** (`FeatureVersion has no parent Feature: …`).
- **Сервисы**: `Service -[:AGGREGATES]-> Feature` для родительской фичи, только активные рёбра (`deleted` отсутствует или не `true`, [spec §2.1](./spec.md)); сервисы в **`archive`** **исключаются** из on-prod-диаграммы.
- **Юнит**: по цепочке `Unit -[:PROVIDES]-> Service` для включённых в ответ сервисов.
- **Организация вокруг компонентов**: от этой `FeatureVersion` — `USES_COMPONENT_VERSION` → `ComponentVersion` (для опубликованной линии фичи, статус **`active`**, — только статусы **`active`** / **`deprecated`** у целей `USES`; для **черновика** (`draft`) — все цели `USES` без фильтра по статусу) → родитель `Component`, `Team` (`MAINTAINS`, `HAS_TEAM`, юнит команды), `Application` / `ApplicationVersion` по правилам ниже, но **только** если `Application` принадлежит одному из юнитов, полученных из `STAKEHOLDER` на фичу или из `PROVIDES` перечисленных сервисов (`OWNS`) — для пути через `HAS_COMPONENT` владельца.
- **Резолв `ApplicationVersion` (снимок vs current)** ([spec §6](./spec.md)):
  - **`draft`**: как раньше — `ApplicationVersion {status: current}` и её `HAS_COMPONENT`.
  - **опубликованная** (`active` / `unactive` / …): `ApplicationVersion` только через **`PINNED_TO_APPLICATION_VERSION`** от этой FV; `HAS_COMPONENT` — от **pinned** AV. Fallback на `current` **запрещён**.
  - если для приложения из состава/`USES`/`providerApplicationId` pin **нет** — в ответ входит нода `Application` **без** `ApplicationVersion` и без `HAS_COMPONENT` от current (на SPA заголовок контейнера без «· version»).
- **Приложения из контекста `USES`**: дополнительно включаются `Application` с `id = USES_COMPONENT_VERSION.applicationId` для каждого ребра состава ([spec §6](./spec.md)) — **без** фильтра по юнитам владельца; для **`draft`** к ним подтягиваются `current` AV (`HAS_VERSION`) и `HAS_COMPONENT` на версии из состава, если есть; для **опубликованной** — pinned AV той же FV (если pin есть). На фронте такие приложения становятся контейнерами для соответствующих `ComponentVersion` даже без `HAS_COMPONENT` ([diagrams-frontend.md](./diagrams-frontend.md)).
- **Скрытие `STAKEHOLDER`**: ребро `Unit -[:STAKEHOLDER]-> Feature` **исключается из ответа**, если в подграфе есть хотя бы одно активное `AGGREGATES` от сервиса к этой фиче.
- **Интеграции**: в ответ включаются **исходящие** рёбра **`DEPENDS_ON`** от CV состава (`a.id IN ids`), у которых в `context` **`consumerFeatureVersionId` = `:id`** этой FeatureVersion (same-unit и cross-unit на публичный контракт поставщика, [spec §6](./spec.md) / [ui-spec §5.4](./frontend/ui-spec.md)); плюс контекст вокруг состава **и** поставщиков-соседей, включая **`Application`** из `context.providerApplicationId` и из `USES.applicationId`. Для опубликованной FV AV поставщика — через pin; для draft — `current`. **Пример:** в одном draft есть и `A→B`, и `B→A` с `consumerFeatureVersionId = :id` — в ответ входят **оба** relationship (отдельные рёбра). Входящие рёбра и рёбра с **чужим** `consumerFeatureVersionId` **не** входят. Продуктовая видимость cross-unit на холсте (чекбокс **«Связь с другим юнитом»**) — только на SPA ([diagrams-frontend.md](./diagrams-frontend.md)).
- Раскладка: `orientGraphByLayerOrder` с `DIAGRAM_LAYER_ORDERS.feature` — слои слева направо: Unit → Team → Application → Feature → Service (Component·версия внутри контейнера Application). Полный граф с `Team` / `MAINTAINS` всегда в ответе; скрытие команд и cross-unit — только на SPA (чекбоксы «Команды» / «Связь с другим юнитом», [ui-spec §5.4](./frontend/ui-spec.md)). На SPA ноды Feature / FeatureVersion / Service и **все** `Unit` с холста скрываются (контекст фичи — в заголовке; cross-unit hint — tooltip у `?`).
- **Сравнение версий** на SPA: предшественник резолвится из `inheritedFromId` списка `POST /api/feature-versions` ([api.md](./api.md)); второй снимок — повторный вызов этого же `GET` для предшественника; diff и подсветка — только на клиенте ([diagrams-frontend.md](./diagrams-frontend.md), [ui-spec §5.4](./frontend/ui-spec.md)).

## `GET /api/components/:id`

Возвращает одну сущность `Component` по `id`, в том же виде, что и элементы списка из `POST /api/components`: поля ноды графа плюс `team` (первый из `MAINTAINS`).

При отсутствии ноды ответ — `null` (как у `GET /api/features/:id` и др.).

## См. также

- [ui-spec.md §5](./frontend/ui-spec.md) — сценарии диаграмм.
