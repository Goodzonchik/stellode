# Компонент и версии

**Компонент** — модуль в коде (класс, service, controller), отвечающий за реализацию конкретной бизнес-логики, или управляемый модуль (например, набор таблиц в инстансе postgress) в вендорской системе.

**Версия компонента** — конкретная версия контракта компонента.

## Версионирование компонента

При создании компонента автоматически создаётся первая `ComponentVersion` со статусом `draft`.

> [!WARNING]
> У компонента одновременно допустима только одна `draft`. Публикация `draft → active` выполняется только в визарде релиза приложения.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1 (draft)"))
  Component -->|HAS_DRAFT| CV1
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef draft fill:#E6F4FF,stroke:#69B1FF,color:#0958D9,stroke-width:2px
  class Component component
  class CV1 draft
```

После релиза приложения, в котором эта версия вошла в состав, черновик публикуется: `draft → active`. Связь меняет тип с `HAS_DRAFT` на `HAS_VERSION`.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1 (active)"))
  Component -->|HAS_VERSION| CV1
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  class Component component
  class CV1 active
```

Новая draft версия наследуется от последней версии, с максимальным `versionNumber` среди всех версий приложения. Создается связь `INHERITED` от новой к предыдущей. У **компонента** одновременно могут быть несколько `HAS_VERSION` и один `HAS_DRAFT`.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1 (active)"))
  CV2(("v2 (draft)"))
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

### Полная статустная модель компонента

Статусы `active` / `deprecated` / `unactive` задаются релизами приложений, на схеме нижу указан только полный набор связей.

```mermaid
flowchart TB
  Component((Компонент))
  CV1(("v1 (unactive)"))
  CV2(("v2 (deprecated)"))
  CV3(("v3 (active)"))
  CV4(("v4 (draft)"))
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

### Миграция версий в одном приложении

В одном приложении допустимы несколько версий одного компонента, например одна версия `active` для новых пользователей и `deprecated` для старых.

```mermaid
flowchart TB
  App(("Приложение"))
  AV(("ApplicationVersion<br/>(current)"))
  Component((Компонент))
  CV1(("v1 (deprecated)"))
  CV2(("v2(active)"))
  App -->|HAS_VERSION| AV
  Component -->|HAS_VERSION| CV1
  Component -->|HAS_VERSION| CV2
  CV2 -->|INHERITED| CV1
  AV -->|"HAS_COMPONENT"| CV1
  AV -->|"HAS_COMPONENT"| CV2
  classDef component fill:#E6F4FF,stroke:#1677FF,color:#1677FF,stroke-width:2px
  classDef application fill:#E6FFFB,stroke:#13C2C2,color:#08979C,stroke-width:2px
  classDef deprecated fill:#FFFBE6,stroke:#FAAD14,color:#D48806,stroke-width:2px
  classDef active fill:#F6FFED,stroke:#52C41A,color:#389E0D,stroke-width:2px
  class Component component
  class App,AV application
  class CV1 deprecated
  class CV2 active
```

### Статус unactive

Глобальный `unactive` появляется только после пересчёта состояния, то есть версии нет ни в одном приложении в статусе `current`.