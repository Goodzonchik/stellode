# Компонент и версии

**Компонент** — модуль в коде или управляемый модуль в вендорской системе.  
**Версия компонента** — конкретная версия контракта. Цепочка версий линейная (`INHERITED`), без ветвления.

У компонента одновременно допустима только одна `draft`. Глобальный статус опубликованной версии **производный**: его задаёт состав текущих релизов приложений (`HAS_COMPONENT`), а не ручная смена на странице компонента. Публикация `draft → active` выполняется только в визарде релиза приложения.

Цвета на схемах — палитра Ant Design: компонент (синий), `draft` (голубой), `active` (зелёный), `deprecated` (золотой), `unactive` (серый), приложение (бирюзовый).

## 1. Только компонент

Нода без версий — логическая точка старта. В продукте при создании компонента сразу появляется первая версия-черновик.

```mermaid
flowchart LR
  Component((Компонент))
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  class Component component
```

## 2. Первая версия (черновик)

При создании компонента автоматически создаётся первая `ComponentVersion` со статусом `draft`. Предшественника нет — ребра `INHERITED` ещё нет. Черновик висит на `HAS_DRAFT`.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>draft"))
  Component -->|HAS_DRAFT| CV1
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef draft fill:#E6F4FF,stroke:#69B1FF,color:#0958D9,stroke-width:2px
  class Component component
  class CV1 draft
```

## 3. Публикация первой линии

После релиза приложения, в котором эта версия вошла в состав, черновик публикуется: `draft → active`. Учёт переходит с `HAS_DRAFT` на `HAS_VERSION`.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>active"))
  Component -->|HAS_VERSION| CV1
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  class Component component
  class CV1 active
```

## 4. Новая draft поверх опубликованной

Пока есть `draft`, вторую не создают. Новая draft строится от **версии-базы**: максимальный `versionNumber` среди `active` / `deprecated` (если таких нет — среди всех опубликованных, включая `unactive`). Связь истории — `INHERITED` от новой к предыдущей. У родителя одновременно могут быть `HAS_VERSION` (опубликованные) и один `HAS_DRAFT`.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>active"))
  CV2(("v2<br/>draft"))
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_DRAFT| CV2
  CV2 -->|INHERITED| CV1
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  classDef draft fill:#E6F4FF,stroke:#69B1FF,color:#0958D9,stroke-width:2px
  class Component component
  class CV1 active
  class CV2 draft
```

## 5. Каталог версий без приложений

На странице компонента видны только сам компонент и его версии: приложения на схему не выводятся. Ниже — полный набор статусов в одной линейной цепочке: `unactive`, `deprecated`, `active` и одна `draft`. Статусы `active` / `deprecated` / `unactive` по-прежнему задаются релизами приложений; здесь показан только каталог линий.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>unactive"))
  CV2(("v2<br/>deprecated"))
  CV3(("v3<br/>active"))
  CV4(("v4<br/>draft"))
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_VERSION| CV2
  Component -->|HAS_VERSION| CV3
  Component -->|HAS_DRAFT| CV4
  CV2 -->|INHERITED| CV1
  CV3 -->|INHERITED| CV2
  CV4 -->|INHERITED| CV3
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef unactive fill:#F5F5F5,stroke:#8C8C8C,color:#8C8C8C,stroke-width:2px
  classDef deprecated fill:#FFFBE6,stroke:#FAAD14,color:#D48806,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  classDef draft fill:#E6F4FF,stroke:#69B1FF,color:#0958D9,stroke-width:2px
  class Component component
  class CV1 unactive
  class CV2 deprecated
  class CV3 active
  class CV4 draft
```

## 6. Несколько опубликованных линий

После публикаций у компонента остаётся каталог всех `HAS_VERSION`. Появление новой версии **не** переводит предыдущую в `unactive` само по себе. У компонента **допускается несколько глобально `active`** одновременно — если разные приложения держат разные линии. Инвариант «одна `active`» действует только внутри состава одного релиза приложения.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>active"))
  CV2(("v2<br/>active"))
  AppA(("Приложение A<br/>current"))
  AppB(("Приложение B<br/>current"))
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_VERSION| CV2
  CV2 -->|INHERITED| CV1
  AppA -->|"HAS_COMPONENT<br/>active"| CV1
  AppB -->|"HAS_COMPONENT<br/>active"| CV2
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  classDef application fill:#E6FFFB,stroke:#13C2C2,color:#08979C,stroke-width:2px
  class Component component
  class CV1,CV2 active
  class AppA,AppB application
```

В релизе можно взять любую **более позднюю** версию по цепочке `INHERITED` без обязательного выпуска промежуточных релизов для каждой ступени.

## 7. Миграция в одном приложении

В одном `ApplicationVersion(current)` допустимы несколько версий одного компонента (миграция), но не больше одной строки с прикладным `active`. Остальные — `deprecated`. Глобальный статус каждой CV по-прежнему считается по **всем** `current`-релизам.

```mermaid
flowchart TB
  App(("Приложение"))
  AV(("AV<br/>current"))
  Component((Компонент))
  CV1(("v1<br/>deprecated"))
  CV2(("v2<br/>active"))
  App -->|HAS_VERSION| AV
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_VERSION| CV2
  CV2 -->|INHERITED| CV1
  AV -->|"HAS_COMPONENT<br/>deprecated"| CV1
  AV -->|"HAS_COMPONENT<br/>active"| CV2
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef application fill:#E6FFFB,stroke:#13C2C2,color:#08979C,stroke-width:2px
  classDef deprecated fill:#FFFBE6,stroke:#FAAD14,color:#D48806,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  class Component component
  class App,AV application
  class CV1 deprecated
  class CV2 active
```

## 8. Когда версия становится unactive

Глобальный `unactive` появляется только после пересчёта: версии нет ни в одном `current` (рёбра `HAS_COMPONENT` остались только у `previous` или отсутствуют). Новое приложение / новая интеграция на такую версию не заводятся.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1<br/>unactive"))
  CV2(("v2<br/>active"))
  App(("Приложение<br/>current"))
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_VERSION| CV2
  CV2 -->|INHERITED| CV1
  App -->|"HAS_COMPONENT<br/>active"| CV2
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef unactive fill:#F5F5F5,stroke:#8C8C8C,color:#8C8C8C,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  classDef application fill:#E6FFFB,stroke:#13C2C2,color:#08979C,stroke-width:2px
  class Component component
  class CV1 unactive
  class CV2 active
  class App application
```

## Что делать в UI

1. Откройте **«Компоненты»** → карточку компонента (`/components/:id`).
2. Создайте новую draft (**«Создать версию»**); номер можно поправить.
3. Смену статуса и публикацию `draft → active` выполняйте только в визарде **«Новый релиз»** приложения — не на странице версий компонента.

## Связанные статьи

- [Релиз приложения](./application-release.md)
- [Фича и состав](./feature.md)
- [Глоссарий](../glossary.md)
