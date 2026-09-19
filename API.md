# Monk's Enhanced Journal — Extension API

Monk's Enhanced Journal (MEJ) exposes a small extension surface that lets another module:

1. register a custom journal-page type that renders inside MEJ's tabbed journal shell, and/or
2. register a "shell page" — an arbitrary application that opens as a tab in MEJ's shell without being backed by a `JournalEntryPage` document at all.

This document describes that surface as implemented. It does not cover MEJ's internal sheet classes or rendering pipeline beyond what a consumer needs to integrate with them.

## Setup hook and timing

MEJ calls:

```js
Hooks.callAll("setupMonksEnhancedJournal", MonksEnhancedJournal.getApi());
```

from inside its own static `init()` method, which itself runs inside a `Hooks.once("init", ...)` callback registered at the bottom of `monks-enhanced-journal.js`. In other words, `setupMonksEnhancedJournal` fires during Foundry's `init` hook — not `setup` or `ready`.

Foundry does **not** guarantee the relative order in which different modules' `init` hooks fire. If your module also waits for its own `init` hook before calling `Hooks.on("setupMonksEnhancedJournal", ...)`, MEJ's `init` handler may already have run and fired the hook before yours registers a listener for it — and you'd miss it.

The safe pattern is to register the listener **at the top level of your module's entry script**, so it runs at import time (before any `init` hooks fire), not inside your own `init` handler:

```js
// campaign-companion.js — top level, executed as soon as the script loads
Hooks.on("setupMonksEnhancedJournal", (api) => {
  // register your sheet type(s) / shell page(s) here
});
```

The `api` object passed to the hook is the return value of `MonksEnhancedJournal.getApi()` and currently exposes two methods: `registerSheetType` and `registerShellPage`.

`game.MonksEnhancedJournal` (the `MonksEnhancedJournal` class itself) is also assigned during `init()`, immediately before the hook fires, so it's available by the time your listener runs.

## `api.registerSheetType(options)`

Registers a custom `JournalEntryPage` subtype that MEJ will treat as one of its own journal types — it gets a tab, appears in MEJ's "create page" type list, and its sheet renders inside MEJ's journal shell like `person`, `quest`, `shop`, etc.

```js
registerSheetType({ key, moduleId, sheetClass, label, icon, relationships = [] })
```

| Param | Required | Description |
|---|---|---|
| `key` | yes | The bare type id (e.g. `"session"`). Must not collide with a built-in MEJ type or another registered external type — MEJ throws if `key` is already registered. |
| `moduleId` | yes | Your module's id, exactly as declared in your `module.json`. |
| `sheetClass` | yes | The sheet class used to render pages of this type. Must extend `EnhancedJournalSheet` (see below). |
| `label` | no | An i18n key (or plain string) used as the type's display label, e.g. in the type-labels list and page-create menu. |
| `icon` | no | A FontAwesome class string (e.g. `"fa-solid fa-scroll"`), used as the fallback tab/type icon when the page's flagged type isn't one of MEJ's built-ins. |
| `relationships` | no | Array of built-in MEJ type keys (e.g. `["person", "place"]`) your type is allowed to be linked to via MEJ's relationship UI. Defaults to `[]`. |

Internally, `registerSheetType` registers `sheetClass` as the Foundry sheet for **both** `key` and `${moduleId}.${key}` via `foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, sheetClass, { types: [key, \`${moduleId}.${key}\`], makeDefault: true, label: i18n(label) })`, and merges `label` into `CONFIG.JournalEntryPage.typeLabels`.

The `${moduleId}.${key}` form matters because Foundry auto-namespaces module-declared `documentTypes` subtypes as `${moduleId}.${key}` in the database — that's the real, persisted `type` on the document. MEJ's own `fixType()` logic (see below) coerces the page's in-memory `type` to the bare `key` once it recognizes the page (via the `flags["monks-enhanced-journal"].type` flag), so registering the sheet for both forms covers the page both before and after that coercion runs.

### Worked example: a `session` type

**1. Declare the subtype in your module's `module.json`:**

```json
{
  "id": "campaign-companion",
  "documentTypes": {
    "JournalEntryPage": {
      "session": {
        "htmlFields": ["description"]
      }
    }
  }
}
```

**2. Register your listener at the top level of your entry script, and call `registerSheetType`:**

```js
// campaign-companion.js
import { SessionSheet } from "./sheets/session-sheet.js";

Hooks.on("setupMonksEnhancedJournal", (api) => {
  api.registerSheetType({
    key: "session",
    moduleId: "campaign-companion",
    sheetClass: SessionSheet,
    label: "CAMPAIGN-COMPANION.sheettype.session",
    icon: "fa-solid fa-scroll",
    relationships: ["person", "place"]
  });
});
```

**3. Your sheet class extends `EnhancedJournalSheet` and declares `static get type()`, matching MEJ's own sheet-class convention (see `sheets/PersonSheet.js` for a built-in example):**

```js
// sheets/session-sheet.js
import { EnhancedJournalSheet } from "/modules/monks-enhanced-journal/sheets/EnhancedJournalSheet.js";

export class SessionSheet extends EnhancedJournalSheet {
  static get type() {
    return "session"; // must match the `key` passed to registerSheetType
  }

  static PARTS = {
    main: {
      root: true,
      template: "modules/campaign-companion/templates/session-sheet.hbs"
    }
  };
}
```

`EnhancedJournalSheet.allowedRelationships` reads `this.constructor.type` when deciding which built-in and externally-registered types a page can relate to, so `static get type()` returning the registered `key` is required, not optional — leaving it unset inherits the base class's `"blank"`.

## `api.registerShellPage(options)` and `game.MonksEnhancedJournal.openShellPage(id, options)`

Shell pages let a module open an arbitrary application as a tab inside MEJ's journal shell, without there being a backing `JournalEntryPage` document at all — useful for a dashboard, summary view, or any UI that doesn't map onto journal content.

```js
registerShellPage({ id, label, icon, appClass })
```

| Param | Required | Description |
|---|---|---|
| `id` | yes | Unique shell-page id. Used as the synthetic page "type" and as the argument to `openShellPage`. |
| `appClass` | yes | The sheet class rendered for this shell page. Must extend `EnhancedJournalSheet`, and should define `static get type()` returning `id`, per the same convention as `registerSheetType` sheet classes. |
| `label` | no | i18n key or string used as the tab title. |
| `icon` | no | Accepted but currently **not** wired into tab-icon rendering — MEJ's `getIcon()` only consults `externalTypes[type].icon` (the `registerSheetType` registry), not `shellPages[type].icon`. A shell page's tab currently falls back to MEJ's default icon regardless of this value. |

Unlike `registerSheetType`, `registerShellPage` does **not** throw on a duplicate `id` — it silently overwrites `MonksEnhancedJournal.shellPages[id]`. This matters if your module re-registers on hot-reload: the last call wins with no warning.

`registerShellPage` only registers the page in `MonksEnhancedJournal.shellPages`; it does not open anything. To actually open (or re-activate, if already open) a tab for a registered shell page, call the **static** method on the `MonksEnhancedJournal` class itself — **not** a method on the `api` handle passed into the setup hook:

```js
game.MonksEnhancedJournal.openShellPage(id, options);
```

```js
static async openShellPage(id, options = {})
```

Returns `false` (without doing anything) if `id` isn't a registered shell page. Otherwise it lazily creates/renders MEJ's `EnhancedJournal` app if it isn't already open, finds (or synthesizes) the tab entity for the shell page, and opens it — `options.newtab` controls whether it opens in a new tab. Returns `true` on success.

```js
// anywhere after setupMonksEnhancedJournal has fired
Hooks.on("setupMonksEnhancedJournal", (api) => {
  api.registerShellPage({
    id: "campaign-dashboard",
    label: "CAMPAIGN-COMPANION.dashboard.title",
    appClass: DashboardShellSheet
  });
});

// later, e.g. from a scene control button:
game.MonksEnhancedJournal.openShellPage("campaign-dashboard");
```

### Current limitation: shell pages are not full citizens of MEJ's theming/state system

Shell pages are backed by an internal placeholder document (`BlankJournal`), not a real `JournalEntryPage`. Two consequences to be aware of:

- **No per-type theming.** MEJ's per-type sheet settings (`setting("sheet-settings")`, configured via MEJ's own UI) are keyed by the real journal types returned from `MonksEnhancedJournal.getDocumentTypes()` / `getTypeLabels()`. Shell page ids registered via `registerShellPage` are **not** merged into those type maps (only `registerSheetType` types are), so a shell page cannot be themed or configured through MEJ's sheet-settings UI.
- **No subsheet part-state preservation across re-renders.** `EnhancedJournal._replaceHTML` snapshots and restores ApplicationV2 part state (focus, scroll position, etc.) for the active subsheet, but explicitly skips this for any tab whose document type is "synthetic" (`isSyntheticType()`, which includes every registered shell page id, plus the built-in `blank`/`folder` placeholders). Re-renders of a shell page's sheet will not preserve its part state the way a real journal-type sheet's would.

## Consumer-facing hooks

MEJ fires (or defers to) the following hooks that a consumer module can also listen to, independent of the registration API above:

| Hook | Fired via | Description |
|---|---|---|
| `renderJournalPageSheet` | `Hooks.callAll("renderJournalPageSheet", subsheet, subsheetElement, context)` | Fires after MEJ renders a page's subsheet inside its journal shell (for real, non-synthetic page types only). `context` includes `enhancedjournal` (the hosting `EnhancedJournal` app instance) merged with the subsheet's render context. |
| `activateControls` | `Hooks.callAll("activateControls", this, ctrls)` | Fires when MEJ builds the header control bar for the active tab. `this` is the `EnhancedJournal` app instance; `ctrls` is the mutable array of control definitions about to be rendered — listeners can push/modify/remove entries before they're rendered. |
| `openJournalEntry` | `Hooks.call("openJournalEntry", doc, options, game.user.id)` | Fires before MEJ opens a `JournalEntry` in its shell. Returning `false` from a listener cancels the open (standard `Hooks.call` veto semantics). A parallel `openJournalEntryPage` hook exists for `JournalEntryPage` documents. |

## Interop flags MEJ owns

MEJ uses document flags under the `monks-enhanced-journal` namespace to track its own state on documents. The two most relevant for integration:

- **`flags["monks-enhanced-journal"].type`** — the MEJ journal type for a page (or, on a `JournalEntry` with a single page, inherited by that page). This is the flag `fixType()` reads to decide what real `type` to coerce a page's in-memory `type` field to. For an externally-registered type, set this flag to the bare `key` you passed to `registerSheetType` (matching what Foundry stores as `${moduleId}.${key}` on disk).
- **`flags["monks-enhanced-journal"].relationships`** — **an object/map keyed by relationship id**, not an array. Each value is a relationship record, at minimum `{ id, uuid, hidden }` (`id` is the related entry's document id, `uuid` its full uuid, `hidden` whether it's concealed from players); `EnhancedJournalSheet.getRelationships()` (sheets/EnhancedJournalSheet.js:880-891) also transiently decorates entries with display fields (`name`, `img`, `type`, etc.) when building the relationship list for rendering. Example stored shape:

  ```js
  {
    "abc123": { id: "abc123", uuid: "JournalEntry.abc123", hidden: false },
    "def456": { id: "def456", uuid: "JournalEntry.def456", hidden: true }
  }
  ```

  A legacy array shape exists from older data: `getRelationships()` detects `relationships instanceof Array`, migrates it into the keyed-object form (keyed by each entry's `.id`), and persists the migrated object back via `setFlag`. Don't write an array to this flag — write (or merge into) the keyed-object form, e.g. via the same read-duplicate-merge-setFlag pattern MEJ itself uses (see `addRelationship()`, sheets/EnhancedJournalSheet.js:3298-3321). `EnhancedJournalSheet.allowedRelationships` combines MEJ's built-in relationship types with whatever `externalRelationshipTypes(type)` returns for the current sheet's `type`, i.e. the `relationships` array you passed to `registerSheetType` — that's a separate, unrelated array (of allowed *type keys*, not relationship records).

Treat both as owned by MEJ: read them, but prefer going through `registerSheetType`/`fixType` rather than writing `flags["monks-enhanced-journal"].type` by hand outside of document creation.

## `fixType()` and the foreign-subtype guarantee

`MonksEnhancedJournal.fixType(object, settype)` runs on journal pages (and entries) throughout MEJ to reconcile a page's in-memory `type` with its `flags["monks-enhanced-journal"].type` (or its parent entry's, for single-page entries), and to normalize a couple of legacy type aliases (`base`/`oldentry` → `journalentry`, `checklist` → `list`).

If the resolved type isn't one MEJ currently recognizes (i.e. not a built-in type and not in `MonksEnhancedJournal.externalTypes`, which is only populated while the owning module is active and has called `registerSheetType`), the flag-unsetting logic below runs **only on a GM client** — `else if (game.user.isGM) { ... }`. On that branch, `fixType` checks whether the page's real, persisted (`_source`) type looks like a foreign module subtype — i.e. it contains a `.` and doesn't start with `monks-enhanced-journal.`:

```js
type = type || object.type;
if (types[type])
    object.type = type;
else if (game.user.isGM) {
    let sourceType = object._source?.type ?? "";
    let foreignSubtype = sourceType.includes(".") && !sourceType.startsWith("monks-enhanced-journal.");
    if (!foreignSubtype)
        object.unsetFlag("monks-enhanced-journal", "type");
}
```

The accurate guarantee has two parts:

- **Non-GM clients never touch the flag at all.** The whole unset branch is gated behind `game.user.isGM`, so on a player client an unrecognized type simply falls through without any flag mutation.
- **GM clients skip unsetting only when the source type is namespaced to another module.** If the page's persisted `_source.type` is a foreign subtype (e.g. `campaign-companion.session`, matching the `${moduleId}.${key}` form Foundry persists for a module-declared `documentTypes` subtype), the GM client leaves `flags["monks-enhanced-journal"].type` alone rather than stripping it. If the source type isn't foreign-namespaced (no `.`, or it does start with `monks-enhanced-journal.`), a GM client *will* unset the flag.

In practice this means: **if the module that owns a custom sheet type is disabled, MEJ will not recognize or render that type, but a GM client will not delete the flag or otherwise mangle the page's data** (and no client will touch it while acting as a non-GM). The page's MEJ type flag and content survive untouched, and the page will be recognized correctly again as soon as the owning module is re-enabled and calls `registerSheetType` on the next load.
