# Маршруты SPA (React Router)

Канонический документ по навигации и маршрутам SPA. Верхнее меню — конфиг `apps/frontend/src/navigation/app-nav-pages.ts` и компонент `Navigation.tsx`; дерево `<Routes>/<Route>` — в `apps/frontend/src/AppRoutes.tsx`. Корневой `App.tsx` подключает провайдеры, шапку и рендерит `AppRoutes`.

## Принципы навигации

- Глобальный контекст юнита задаётся на `/units` (**«Сделать основным»**) и хранится в `UnitContext`; в шапке рядом с пунктом **«Юниты»** показывается имя выбранного юнита (`Tag`). Списковые страницы и диаграммы используют выбранный юнит.
- Режим проекции графа определяется автоматически по статусу сущности на маршруте: опубликованная линия (`active` / `current`) → **`on-prod`**, контекст **`FeatureVersion` / `ComponentVersion` со статусом `draft`** → **`draft`**.
- Ручного переключателя **`on-prod`** / **`draft`** нет: режим следует из текущего маршрута и выбранной сущности. На диаграмме услуги история снятых `AGGREGATES` — только через query **`?projection=draft`** ([aggregates-api.md](../aggregates-api.md)).
- Диаграммы живут под URL сущности (`/{collection}/:id/diagram…`). Отдельного пункта меню **«Диаграммы»** нет; на диаграмме активна вкладка соответствующей сущности. Клик по вкладке меню всегда ведёт в **корень** раздела (списковую страницу, например `/units`, `/applications`).
- Старые SPA-пути `/diagrams/**` не поддерживаются (404). Backend API `/api/diagrams/...` без изменений.

## Верхнее меню (списковые страницы)

| Раздел | Маршрут | Куда навигируемся |
|---|---|---|
| Units | `/units` | Страница `Units` |
| Applications | `/applications` | Страница `Applications` |
| Services | `/services` | Страница `Services` |
| Features | `/features` | Страница `Features` |
| Teams | `/teams` | Страница `Teams` |
| Components | `/components` | Страница `Components` |
| Инструменты → Mermaid | `/tools/mermaid` | Страница превью Mermaid (`MermaidToolsPage`); пункт меню **перед** «Справка» |
| Справка | `/help` | Редирект на первую страницу из `public/help/manifest.json` (копия канона `docs/help/`, `/help/:slug`) |

### Deep-link подсветки строки

Общий query-контракт списковых страниц:

- `highlight=<entityId>` — id строки для подсветки (пока параметр в URL)
- `ctx.<key>=<value>` — произвольный контекст (например `ctx.unitId`)

Источники: ссылки из модалки готовности функционала; ПКМ диаграмм **«Открыть в списке»** ([ui-spec §5.2.1](./ui-spec.md)).

Примеры: `/applications?highlight=<applicationId>&ctx.unitId=<unitId>`, `/components?highlight=<componentId>&ctx.unitId=<unitId>`, `/teams?highlight=<teamId>&ctx.unitId=<unitId>`, `/units?highlight=<unitId>&ctx.unitId=<unitId>`. Поведение при отсутствии строки и чужом юните — [ui-spec §7.3](./ui-spec.md).

## Детальные страницы

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/features/:id` | `FeatureVersions` | К списку версий выбранной фичи |
| `/applications/:id` | `ApplicationVersions` | К списку версий выбранного приложения |
| `/components/:id` | `ComponentVersions` | К списку версий выбранного компонента |
| `/services/:id` | `ServiceDiagramRedirect` | Редирект на `/services/:id/diagram` |

## Диаграммы

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/units/:id/diagram` | `Diagrams` | Диаграмма юнита; данные `GET /api/diagrams/unit/:id` |
| `/units/:id/diagram/cross-unit` | `CrossUnitDiagram` | Cross-unit; центр = `:id` в пути; данные `GET /api/diagrams/cross-unit?centerUnitId=` |
| `/teams/:id/diagram` | `Diagrams` | Диаграмма команды; данные `GET /api/diagrams/team/:id` |
| `/services/:id/diagram` | `Diagrams` | Диаграмма сервиса (состав `AGGREGATES`, §5.6 [ui-spec](./ui-spec.md)); данные `GET /api/diagrams/service/:id` |
| `/services/:id/diagram/integrations` | `Diagrams` | Расширение по **`DEPENDS_ON`** (вкладка «Интеграции»); данные `GET /api/diagrams/service/:id/integrations` |
| `/features/:id/diagram` | `FeatureDiagramRedirect` | Редирект на `/feature-versions/:fvId/diagram` (active, иначе max `versionNumber`) |
| `/feature-versions/:id/diagram` | `Diagrams` | Диаграмма версии функционала (§5.4 [ui-spec](./ui-spec.md)); данные `GET /api/diagrams/feature-version/:id`; в меню подсвечивается **Фичи** |
| `/components/:id/diagram` | `Diagrams` | Диаграмма компонента; данные `GET /api/diagrams/component/:id` |
| `/applications/:id/versions/:version/diagram` | `ApplicationComposition` | Таблица состава `ApplicationVersion` (`:version` = `current` \| строка `version`; `latest` / нет цели → 404) |
| `/applications/:id/diagram` | Redirect | Редирект на `…/versions/current/diagram` |

### Правила cross-unit

- Центр задаётся сегментом `:id` в `/units/:id/diagram/cross-unit`.
- Если `:id` невалиден как UUID, центр может браться из `UnitContext` (fallback `resolveCrossUnitCenterUnitId`).
- Если центр определить нельзя — заглушка со ссылкой на `/units`.
- Переключатель **«Юнит»** ведёт на `/units/:id/diagram` того же юнита.

## Визард релиза

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/applications/:id/release` | `ReleaseWizard` | Пошаговый визард релиза для приложения `:id` |

Точки входа — кнопка **«Новый релиз»** в шапке страницы **`/applications/:id`** и в строке списка **`/applications`** ([ui-spec §4](./ui-spec.md)). Если у приложения ещё нет версий, визард стартует с пустого состава (первый релиз).

## Инструменты

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/tools/mermaid` | `MermaidToolsPage` | Textarea + live-превью Mermaid; **не** зависит от `UnitContext` |

Поведение экрана — [ui-spec §10](./ui-spec.md). Экспорт с диаграмм — [ui-spec §5.7](./ui-spec.md).

## Справка

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/help` | `HelpRedirect` | Редирект на `/help/{slug}` первой записи `public/help/manifest.json` (канон — `docs/help/`) |
| `/help/:slug` | `Help` | Статья справки; `slug` = имя md-файла без расширения; оглавление из манифеста (`title` + `file`); md/картинки из sync-копии `public/help` |

Неизвестный `slug` — Alert на странице, оглавление остаётся (без перехода на 404).

| Маршрут | Страница | Куда навигируемся |
|---|---|---|
| `/` | Redirect | Редирект на `/units` |
| `*` | `NotFound` | Страница 404 (в т.ч. старые `/diagrams/**`) |

Семантика диаграмм и API-контракты описаны отдельно: [diagrams-api.md](../diagrams-api.md), [diagrams-frontend.md](../diagrams-frontend.md).
