# Building Custom Visual Components for Creatio Freedom UI

How to create an Angular component that appears in the Freedom UI Designer, renders on Creatio pages, and receives data from Creatio datasources.

This guide is component-agnostic — it covers the framework and patterns, not any specific component logic.

---

## Architecture

A Creatio custom component is an **Angular 17 project** that uses:
- **Webpack Module Federation** — exposes the component as a remote module
- **`@creatio-devkit/common`** — decorators that register the component with Creatio's designer and data system
- **`@angular/elements`** — wraps the component as a custom HTML element
- **`ChangeDetectionStrategy.OnPush`** — prevents Zone.js conflicts with Creatio's shell

The component appears in the Freedom UI Designer toolbar. Users drag it onto pages. Data is fed via page schema handlers.

---

## Project Setup

### 1. Create a Creatio package

In Creatio Configuration UI, create a new package (e.g., `UsrMyPackage`). Set Maintainer to "Customer". Add dependency on `CrtBase`.

### 2. Generate the Angular project

```bash
clio new-ui-project my_component -v usr \
  --package UsrMyPackage --empty true \
  -e creatio-local --silent
```

This creates `projects/my_component/` with webpack.config.js, Angular 17, and Module Federation pre-configured.

### 3. Install dependencies

```bash
cd projects/my_component
npm install
npm install raw-loader --save-dev
```

### 4. Raise the component style budget

In `angular.json`, find `anyComponentStyle` budget and increase it:
```json
{ "type": "anyComponentStyle", "maximumWarning": "20kb", "maximumError": "30kb" }
```

The default 4kb is too small for any real component with inline styles.

---

## Component Structure

### Component file

```typescript
import {
  Component, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef,
  Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef,
} from '@angular/core';
import { CrtViewElement, CrtInput, CrtInterfaceDesignerItem } from '@creatio-devkit/common';

@Component({
  selector: 'usr-my-component',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<!-- template -->`,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
    :host { display: block; outline: none; }
  `],
})
@CrtViewElement({
  selector: 'usr-my-component',
  type: 'usr.MyComponent',
})
@CrtInterfaceDesignerItem({
  toolbarConfig: {
    caption: 'My Component',
    name: 'usr_my_component',
    icon: require('!!raw-loader?{esModule:false}!./icon.svg'),
    defaultPropertyValues: {
      label: 'My Component',
    },
  },
})
export class MyComponent implements OnInit, OnChanges, OnDestroy {
  @Input() @CrtInput() data: any[] = [];

  constructor(
    private hostEl: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { }
  ngOnChanges(changes: SimpleChanges): void { this.cdr.markForCheck(); }
  ngOnDestroy(): void { }
}
```

### Icon file

Create an SVG icon next to the component file. Use a bright, distinctive color so you can find it in the designer:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="20" height="20" rx="2" fill="#FFD600"/>
</svg>
```

### Module registration

```typescript
// app.module.ts
@CrtModule({
  viewElements: [MyComponent],
})
@NgModule({
  declarations: [MyComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule implements DoBootstrap {
  constructor(private _injector: Injector) {}

  ngDoBootstrap(): void {
    const element = createCustomElement(MyComponent, { injector: this._injector });
    if (!customElements.get('usr-my-component')) {
      customElements.define('usr-my-component', element);
    }
    try {
      bootstrapCrtModule('my_component', AppModule, {
        resolveDependency: (token) => this._injector.get(<ProviderToken<unknown>>token),
      });
    } catch (e) { /* Not in Creatio context (local dev) */ }
  }
}
```

---

## Bootstrap File

The bootstrap tells Creatio to load the Module Federation remote entry. Create `packages/UsrMyPackage/Files/src/js/bootstrap.js`:

```javascript
(function () {
    var remoteEntryUrl = Terrasoft.getFileContentUrl(
        "UsrMyPackage",                              // MUST match Creatio package name exactly
        "src/js/my_component/remoteEntry.js"         // MUST match webpack output name
    );
    var script = document.createElement("script");
    script.src = remoteEntryUrl;
    script.type = "text/javascript";
    script.onload = function () {
        if (window.my_component) {
            var shareScopes = (typeof __webpack_share_scopes__ !== "undefined")
                ? __webpack_share_scopes__.default : {};
            try { window.my_component.init(shareScopes); } catch(e) { }
        }
    };
    document.head.appendChild(script);
})();
```

Create `packages/UsrMyPackage/Files/descriptor.json`:

```json
{ "bootstraps": ["src/js/bootstrap.js"] }
```

---

## Critical Rules

### Change detection
1. **Always use `ChangeDetectionStrategy.OnPush`** — without this, the component triggers Zone.js infinite loops inside Creatio's Angular shell, freezing the browser.
2. **Always call `this.cdr.markForCheck()`** after any state mutation that should update the template.

### Encapsulation and styles
3. **Use `ViewEncapsulation.ShadowDom`** — required by Creatio for style isolation.
4. **Import fonts INSIDE component `styles:[]`** — ShadowDom blocks external stylesheets. The `@import url(...)` must be inside the component, not in global styles.
5. **Use plain CSS selectors, not SCSS nesting** — Angular 17 webpack doesn't expand nested SCSS selectors in inline component styles. Write `.parent .child {}` instead of `.parent { .child {} }`.

### Registration
6. **Guard `customElements.define()`** — wrap with `if (!customElements.get('tag-name'))` to prevent "already defined" errors.
7. **Only call `.init()` in bootstrap** — do NOT call `.get("./RemoteEntry")` or `factory()`. Creatio handles component instantiation when the page renders. Calling `factory()` in the bootstrap causes duplicate registration errors.
8. **Wrap `.init()` in try/catch** — it throws if called twice (e.g., navigating between pages).
9. **Check `typeof __webpack_share_scopes__`** — not available on all pages.
10. **Package name must match exactly** — `Terrasoft.getFileContentUrl("UsrMyPackage", ...)` must use the exact Creatio package name. A mismatch results in 404.

### Inputs
11. **Default inputs to empty values** (`[]`, `{}`, `''`) — don't include sample or demo data in defaults. The component should render nothing until configured.

---

## Build and Deploy

### Build
```bash
cd projects/my_component && npm run build
```

Output goes to `packages/UsrMyPackage/Files/src/js/my_component/` (configured in `angular.json` `outputPath`).

### Deploy
```bash
# Copy to deployed Creatio
SRC="packages/UsrMyPackage/Files/src/js/my_component"
PKG="<creatio-app>/Terrasoft.Configuration/Pkg/UsrMyPackage/Files/src/js/my_component"
CONTENT="<creatio-app>/conf/content/UsrMyPackage/src/js/my_component"
rm -rf "$PKG" "$CONTENT"
cp -r "$SRC" "$PKG"
cp -r "$SRC" "$CONTENT"

# Push package (updates file hashes and bootstraps)
clio push-pkg packages/UsrMyPackage -e creatio-local
```

> **Always use `clio push-pkg`** — manual file copies alone won't work because the content hashes in `_FileContentDescriptors.js` won't match.

> **Creatio doesn't follow symlinks** — always use actual file copies.

### Verify
After push, hard-refresh the Creatio page (Cmd+Shift+R). Open the Freedom UI Designer — your component should appear in the left panel toolbar.

---

## Feeding Data to the Component

### Independent datasource

Use an `embeddedModel` to create a datasource independent from the page's list. Without this, hiding a column in the list will affect your component's data:

```javascript
// In viewModelConfigDiff:
{
  "operation": "merge",
  "path": ["attributes"],
  "values": {
    "ComponentItems": {
      "isCollection": true,
      "modelConfig": { "path": "ComponentDS" },
      "viewModelConfig": {
        "attributes": {
          "CDS_Id": { "modelConfig": { "path": "ComponentDS.Id" } },
          "CDS_Name": { "modelConfig": { "path": "ComponentDS.UsrName" } }
          // ... other fields
        }
      },
      "embeddedModel": {
        "name": "ComponentDS",
        "config": {
          "type": "crt.EntityDataSource",
          "config": { "entitySchemaName": "UsrMyEntity" }
        }
      }
    }
  }
}
```

### Handler pattern

Three handlers work together to cover all data scenarios:

```javascript
handlers: [
  // 1. React to data load (fires when Items populate)
  {
    request: "crt.HandleViewModelAttributeChangeRequest",
    handler: async (request, next) => {
      const result = await next?.handle(request);
      if (request.attributeName !== "ComponentItems") return result;
      try {
        window._componentFeed?.(await request.$context.ComponentItems);
      } catch (e) { console.error(e); }
      return result;
    }
  },
  // 2. Set up feed function + handle page re-entry (e.g., returning from edit page)
  {
    request: "crt.HandleViewModelInitRequest",
    handler: async (request, next) => {
      window._componentFeed = (items) => {
        if (!items || !items.length) return;
        const records = extractRecords(items);
        const el = document.querySelector("usr-my-component");
        if (el) el.data = records;
      };
      const result = await next?.handle(request);
      setTimeout(async () => {
        try { window._componentFeed?.(await request.$context.ComponentItems); }
        catch (e) { }
      }, 500);
      return result;
    }
  },
  // 3. Refresh button support
  {
    request: "crt.LoadDataRequest",
    handler: async (request, next) => {
      const result = await next?.handle(request);
      setTimeout(async () => {
        try { window._componentFeed?.(await request.$context.ComponentItems); }
        catch (e) { }
      }, 300);
      return result;
    }
  }
]
```

### Reading Creatio item data

Creatio wraps values in Zone.js proxies. Always read from `item.attributes` and unwrap:

```javascript
const unwrap = (v) => (v != null && typeof v === "object"
  && "__zone_symbol__value" in v) ? v.__zone_symbol__value : v;

const records = [];
for (let i = 0; i < items.length; i++) {
  const a = items[i]?.attributes || {};
  records.push({
    id: String(unwrap(a.CDS_Id) || i),
    name: String(unwrap(a.CDS_Name) || ""),
    value: Number(unwrap(a.CDS_Value)) || 0
  });
}
```

**DO NOT** read `items[i].CDS_Name` directly — it returns a `{__zone_symbol__state, __zone_symbol__value}` proxy object, not the actual value.

---

## Local Testing

Add a test component to `src/app/test/` that renders your component with sample data and JSON editors. In `app.module.ts`, detect the test element for local dev:

```typescript
ngDoBootstrap(appRef: ApplicationRef): void {
  // Register custom element
  const el = createCustomElement(MyComponent, { injector: this._injector });
  if (!customElements.get('usr-my-component')) {
    customElements.define('usr-my-component', el);
  }
  // Local dev: render test page
  const testRoot = document.querySelector('app-test');
  if (testRoot) {
    appRef.bootstrap(TestComponent, testRoot);
    return;
  }
  // Creatio: register remote module
  try {
    bootstrapCrtModule('my_component', AppModule, { ... });
  } catch (e) { }
}
```

Run `ng serve --port 4200` for local testing at http://localhost:4200.

---

## Schema Changes

Page schema files live at `Pkg/{PackageName}/Schemas/{SchemaName}/`. With FSM enabled, changes are picked up on page refresh — no build or push needed.

After making changes in the Creatio UI designer, sync to filesystem:
```bash
clio pkg-to-file-system -e creatio-local
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Browser tab freezes | Missing `OnPush` change detection | Add `changeDetection: ChangeDetectionStrategy.OnPush` to component |
| Component not in designer | Bootstrap doesn't load `remoteEntry.js` | Check `bootstrap.js` creates `<script>` tag and calls `.init()` |
| "Element with this type has already exist" | `factory()` called in bootstrap | Remove `.get("./RemoteEntry")` and `factory()` from bootstrap — only call `.init()` |
| Styles don't apply / fonts missing | Font import in global styles | Move `@import url(...)` inside component `styles:[]` |
| SCSS nesting doesn't work | Inline styles + webpack | Use plain CSS selectors: `.parent .child {}` not `.parent { .child {} }` |
| 404 for component JS | Wrong package name | `Terrasoft.getFileContentUrl()` first argument must match exact Creatio package name |
| Data not showing | Reading proxy objects directly | Use `item.attributes.FIELD_NAME` and unwrap `__zone_symbol__value` |
| Data disappears after closing edit page | `HandleViewModelAttributeChangeRequest` doesn't re-fire | Add `HandleViewModelInitRequest` handler with `setTimeout(500)` fallback |
| List and component interfere | Shared datasource instance | Use `embeddedModel` for independent datasource |
| Changes not reflected after build | Stale content hashes | Always run `clio push-pkg` after deploying new files |
