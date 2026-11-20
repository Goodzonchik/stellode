# API (фрагменты)

Полное описание эндпоинтов — в Swagger (`/api/docs`). Ниже — канонические ответы, важные для UI.

## Applications

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/applications` | Список приложений юнита (UI `/applications`) |

### Список (`POST /applications`)

**Тело:** `{ "unitId": "<uuid>" }`

Элемент ответа (`ApplicationListItem`), помимо полей сущности:

- `currentVersion` — строка `ApplicationVersion.version` со статусом `current`, иначе максимальная по `versionNumber` среди `previous`, иначе `null`
- `currentVersionStatus` — `current` | `previous` | `null` (как на UI списка, [ui-spec §3.1](./frontend/ui-spec.md))
- `hasStatusWarning` — `true`, если у `ApplicationVersion(current)` есть хотя бы одно ребро `HAS_COMPONENT` с `status = deprecated` **или** существует `USES_COMPONENT_VERSION` от FeatureVersion (`draft` | `active` | `deprecated`) к `ComponentVersion(unactive)` с `applicationId` = id этого приложения; иначе `false`. Для маркера на `/applications` ([ui-spec §7.4](./frontend/ui-spec.md), [ui-spec §8.5](./frontend/ui-spec.md)).

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/applications/:id/status-warning-candidates` | Кандидаты шага 1 модалки предупреждения ([ui-spec §8.5](./frontend/ui-spec.md)) |

### Кандидаты предупреждения (`GET /applications/:id/status-warning-candidates`)

**Ответ `200`:** массив `StatusWarningCandidate[]`:

- `componentVersionId`, `componentId`, `componentName`, `version` (строка `ComponentVersion.version`)
- `status` — `deprecated` | `unactive` (причина попадания в список)

Состав: CV с `HAS_COMPONENT.status = deprecated` в `current` этого приложения **и** CV со статусом `unactive`, на которые есть `USES` (FeatureVersion `draft` | `active` | `deprecated`) с `applicationId` = `:id`. Без дублей по `componentVersionId`. **`404`**, если приложения нет.

## Application versions

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/application-versions` | Список версий приложения по `applicationElementId` (UI `/applications/:id`) |
| GET | `/application-versions/:id/composition` | Read-only состав `HAS_COMPONENT` версии ([ui-spec §5.3.2](./frontend/ui-spec.md)) |
| PATCH | `/application-versions/:id` | Переименовать `version` у `ApplicationVersion(current)` ([spec.md §5.4](./spec.md)) |

### Состав (`GET /application-versions/:id/composition`)

**Ответ `200`:** `{ applicationVersionId, applicationId, version, status, items[] }`, где элемент `items`:

- `componentVersionId`, `componentId`, `componentName`
- `teamId` / `teamName` — из `MAINTAINS` (или `null`)
- `componentVersion` — строка `ComponentVersion.version`
- `status` — прикладной `HAS_COMPONENT.status` (`active` | `deprecated`)
- `componentVersionStatus` — глобальный `ComponentVersion.status` (для маркера `unactive` в составе `previous`, [ui-spec §7.4](./frontend/ui-spec.md))

**`404`**, если `ApplicationVersion` с таким `id` нет. SPA для маршрута `/diagrams/application/:applicationId/version/:version` сначала резолвит id версии (`current` по статусу или строка `version`), затем вызывает этот GET.

### Переименование (`PATCH /application-versions/:id`)

**Тело:** `{ "version": "<string>" }`

- Нормализация: `trim`; пустая строка → **`400`**.
- Допустимо только для статуса **`current`**; иначе **`400`**.
- Уникальность `version` в пределах родительского `Application` (§8.1) → конфликт **`409`**.
- Меняется только `version`; `versionNumber`, состав и статус не трогаются.
- **Ответ `200`:** обновлённая строка версии (как элемент списка `/application-versions`).

## Feature versions

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/feature-versions` | Список версий функционала по `featureElementId` (UI `/features/:id`) |
| POST | `/feature-versions/bind-component-versions` | Добавить / снять `USES_COMPONENT_VERSION` у draft FV ([diagrams-frontend.md](./diagrams-frontend.md), spec §6) |
| POST | `/feature-versions/check-ready` | Ручной пересчёт готовности черновика (spec §6) |
| POST | `/feature-versions/raise-component-version` | Поднять версию компонента в draft FV (один `applicationId`) |

### `POST /feature-versions/bind-component-versions`

Изменение состава черновика: массивы `add` / `remove` с элементами `{ componentVersionId, applicationId }` (см. [diagrams-frontend.md](./diagrams-frontend.md)).

**Ошибки (типичные):** `400` — FV не draft / неизвестные id / несовпадение юнита; повтор той же пары `(componentVersionId, applicationId)` уже в составе → **`400`**, сообщение «Такая версия компонента уже добавлена в это приложение» (весь `add` отклоняется). Разные `ComponentVersion` одного компонента и та же CV в другом `applicationId` — допустимы.

### Список версий (`POST /feature-versions`)

**Тело:** `{ "featureElementId": "<uuid>" }`

В элементе ответа, помимо полей версии, `services` и массива `componentVersions` (состав для диалогов / блокировки пустой публикации):

- `componentCount` — число различных `ComponentVersion` по исходящим `USES_COMPONENT_VERSION` (см. [spec.md §6](./spec.md))
- `teamCount` — число различных `Team` с `MAINTAINS` на родительский `Component` этих версий (см. [spec.md §1.1](./spec.md)); включая `type = dependency` и команды другого юнита
- `inheritedFromId` — `uuid` непосредственного предшественника по ребру **`INHERITED`** (`(FeatureVersion)-[:INHERITED]->(FeatureVersion)`), либо **`null`**, если предшественника нет (первая версия в цепочке). Используется SPA для режима сравнения на `/diagrams/feature-version/:id` ([ui-spec.md §5.4](./frontend/ui-spec.md)).

При отсутствии связей оба счётчика равны `0`. На UI `/features/:id` нуль показывается как **`—`** ([ui-spec.md §3.4](./frontend/ui-spec.md)); колонка со списком CV на этой странице не используется.

### `POST /feature-versions/check-ready`

**Тело:** `{ "featureVersionId": "<uuid>" }`

**Ответ `CheckFeatureVersionReadyResult`:**

- `featureVersion` — снимок версии после возможной автопубликации (`id`, `status`, `readyToProduction`)
- `readyToProduction` — `true` только если есть **хотя бы одна** привязка `USES_COMPONENT_VERSION`, **все** `bindings[]` удовлетворяют критерию §6 **и** все `crossUnitBindings[]` готовы; при пустом составе — `false`; пустой `crossUnitBindings` не блокирует
- `reason` — причина неготовности на уровне версии или `null`:
  - `null` — есть привязки (разбор — в `bindings[]` / `crossUnitBindings[]`) или версия готова
  - `no_component_bindings` — нет исходящих `USES_COMPONENT_VERSION` («Нет связанных компонентов»)
- `bindings[]` — разбор по каждой привязке `USES` (`[]` при пустом составе):
  - `applicationId`, `applicationName`
  - `componentId`, `componentName`
  - `componentVersionId`, `componentVersion`
  - `unitId` — юнит приложения/компонента привязки (`coalesce(app.unitId, cv.unitId)`)
  - `statusInRelease` — статус на `HAS_COMPONENT` в `current`-релизе или `null`
  - `ready`, `reason`
    - `ready`
    - `application_has_no_current_release`
    - `component_not_in_current_release`
    - `component_not_active_in_release`
  - Для UI модалки готовности: `applicationId` / `componentId` + `unitId` → ссылки на списки с `?highlight=&ctx.unitId=`; `componentVersion` — колонка «версия» без ссылки (см. [ui-spec.md §7.3](./frontend/ui-spec.md)).
- `crossUnitBindings[]` — разбор по каждому исходящему cross-unit `DEPENDS_ON` от CV состава черновика (тот же shape, что элемент `bindings[]`; `unitId` — юнит поставщика; приложение — `provider.application_id` из контекста ребра). Пустой массив, если таких рёбер нет. UI: вторая таблица **«Другой юнит»** только по строкам с `ready === false` ([ui-spec.md §7.3](./frontend/ui-spec.md)).

### `POST /feature-versions/raise-component-version`

Автоматизация замены CV в составе **draft** FV для одного приложения (spec §6, [ui-spec.md §5.4](./frontend/ui-spec.md)).

**Тело:**

- `featureVersionId` (uuid) — черновик FV
- `fromComponentVersionId` (uuid) — текущая цель `USES`
- `applicationId` (uuid) — `USES.applicationId` кликнутой ноды
- `toComponentVersionId` (uuid, опционально) — целевая CV; если нет — создаётся новая `draft` CV у того же `Component` (правила §4)

**Ответ:**

- `fromComponentVersionId`, `toComponentVersionId`, `applicationId`
- `createdComponentVersion` — `true`, если CV создана в этом запросе

**Поведение:** снимает `USES` `(FV)-[:USES {applicationId}]->(from)` и добавляет на `to` с тем же `applicationId`; синхронизирует исходящие `DEPENDS_ON` у `to` с набором у `from` для `consumerApplicationId = applicationId` (лишние удаляет, недостающие создаёт с `consumerFeatureVersionId` = этот draft); входящие `DEPENDS_ON` этого draft на `from` с `providerApplicationId = applicationId` переносит на `to` (иначе старая CV остаётся на диаграмме). Другие `USES` той же FV не трогает. Не пишет `HAS_COMPONENT` / pin.

**Ошибки (типичные):** `400` — FV не draft / нет исходной привязки / `to` не новее или неверный статус; `409` — нельзя создать draft CV (уже есть `HAS_DRAFT`).

## Component versions

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/component-versions/:id/status-warning` | Детали шага 2 модалки предупреждения ([ui-spec §8.5](./frontend/ui-spec.md)) |

### Детали предупреждения (`GET /component-versions/:id/status-warning`)

**Ответ `200`:** `ComponentVersionStatusWarning`:

- `componentVersionId`, `componentId`, `componentName`, `version`, `status` (глобальный статус CV)
- `applications[]` — `{ id, name }` (без дублей): контекст `DEPENDS_ON` ∪ `HAS_COMPONENT` у `current` (выбранная CV и продовые соседи) ∪ `USES.applicationId` от FeatureVersion `draft` | `active` | `deprecated`
- `teams[]` — `{ id, name }`: `MAINTAINS` выбранной CV ∪ владельцы концов учтённых `DEPENDS_ON`
- `components[]` — соседние продовые CV по `DEPENDS_ON` (оба направления): `{ componentVersionId, componentId, componentName, version, status, direction: 'incoming' | 'outgoing' }`
- `features[]` — `{ id, name, versionId, version, status }` для FeatureVersion с `USES` на выбранную CV (`draft` | `active` | `deprecated`)
- `services[]` — `{ id, name }` через активные `AGGREGATES` к этим Feature

Cross-unit `DEPENDS_ON`: учитывать только при `Component.isPublic = true` у поставщика ([spec.md §8](./spec.md)). **`404`**, если CV нет.

## Edges

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/edge/depends-on/from-feature-versions` | Создать `DEPENDS_ON` из контекста версий фич ([spec.md §7.2](./spec.md)) |
| POST | `/edge/depends-on/delete` | Удалить копию `DEPENDS_ON` у `FeatureVersion(draft)` |
| POST | `/edge/create` | Создать `DEPENDS_ON` с полным context в теле |

### Удаление (`POST /edge/depends-on/delete`)

**Тело:**

- `sourceComponentVersionId`, `targetComponentVersionId` — концы ребра
- `consumerFeatureVersionId` — draft FV-владелец копии
- `consumerApplicationId`, `providerApplicationId` — из context ребра

**Поведение:** если FV отсутствует или не `draft` → **`400`**; если ребро с данным ключом не найдено → **`400`**; иначе physical `DELETE` найденного `DEPENDS_ON` (исторические копии других FV не трогаются). UI: [ui-spec §9.4](./frontend/ui-spec.md).

### Публикация `FeatureVersion` (`draft → active`)

Переход через `POST /feature-versions/transition` (или внутренний `publish`). Если у черновика нет привязок `USES_COMPONENT_VERSION` — **`400`**, сообщение «Нет связанных компонентов» (spec §6). Если привязки есть, но не все готовы к публикации — **`400`**, сообщение «Нельзя активировать фичу. Нажмите «Проверить готовность», чтобы увидеть детали».

При успешной активации создаются рёбра **`PINNED_TO_APPLICATION_VERSION`** к `ApplicationVersion(current)` для каждого distinct приложения из `USES.applicationId` и из `providerApplicationId` исходящих `DEPENDS_ON` состава (spec §6). Если для какого-то приложения нельзя резолвить `current` с нужным `HAS_COMPONENT` — **`400`**, статус не меняется, pin не пишется. Снимок после записи не обновляется.
