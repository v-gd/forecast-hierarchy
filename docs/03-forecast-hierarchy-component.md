# Forecast Hierarchy Component

A data-driven hierarchical table component for sales forecasting. Displays flat data as a tree with configurable columns, progress bars, trend indicators, sorting, resizing, cell selection, and clipboard support.

## Component Inputs

The component (`<usr-forecast-hierarchy>`) accepts three inputs:

### `hierarchy` — tree configuration

Tells the component how to build a tree from flat records:

```javascript
{
  idField: "id",               // unique record ID field
  parentIdField: "parentId",   // parent reference (null = root)
  nameField: "name",           // displayed in the Name column
  subtitleField: "region",     // optional smaller text below name
  statusField: "status",       // optional status icon field
  statusValues: {
    success: ["on-track"],     // green checkmark
    error: ["at-risk"]         // red cross
  }
}
```

### `columns` — what data columns to show

Each column defines how a field is displayed:

```javascript
[
  // Plain value
  { id: "quota", field: "quota", label: "Quota", format: "currency" },

  // Value with progress bar (bar shows field/progressOf percentage)
  { id: "booked", field: "booked", label: "Booked", format: "currency", progressOf: "quota" },

  // Value with trend arrow (compares field vs trendVs)
  { id: "forecast", field: "forecast", label: "Forecast", format: "currency", trendVs: "prevForecast" },

  // Value with automatic color (positive/negative detection)
  { id: "gap", field: "gap", label: "Gap", format: "currency",
    colorRule: { positive: "error", negative: "error" } },

  // Combined: progress bar + trend
  { id: "sales", field: "sales", label: "Sales", format: "currency",
    progressOf: "target", trendVs: "prevSales" },

  // Aggregated parent value (sum of children)
  { id: "total", field: "total", label: "Total", format: "number", aggregate: "sum" }
]
```

**Column properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique column ID (used for visibility/width persistence) |
| `field` | string | Data field name to read from each record |
| `label` | string | Column header text |
| `format` | `'text'\|'number'\|'currency'\|'percent'\|'date'` | Display format. Default: `'text'` |
| `defaultWidth` | number | Default width in px. Default: 140 |
| `minWidth` | number | Minimum resize width. Default: 80 |
| `precision` | number | Decimal places for number/currency. Default: 0 |
| `currencyCode` | string | ISO 4217 code. Default: `'USD'` |
| `progressOf` | string | Field name = 100% for progress bar |
| `trendVs` | string | Field name to compare. `>` = up arrow, `<` = down, `=` = dot |
| `colorRule` | object | `{ positive: 'success'\|'error', negative: 'success'\|'error' }` |
| `aggregate` | `'sum'\|'avg'\|'min'\|'max'\|'count'\|'none'` | Parent row aggregation. Default: `'none'` |

### `data` — flat records

An array of plain objects. The component builds the tree from `idField`/`parentIdField`:

```javascript
[
  { id: "1", parentId: null, name: "Sam Smith", region: "US", status: "at-risk",
    quota: 16000000, booked: 8500000, forecast: 15500000, prevForecast: 15500000 },
  { id: "1-1", parentId: "1", name: "Ben Brown", region: "Northeast",
    status: "on-track", quota: 4000000, booked: 2000000, forecast: 3500000,
    prevForecast: 3800000 },
  // ...
]
```

---

## Features

- **Hierarchical tree** — built from flat data via id/parentId. Expand/collapse with chevron.
- **Sortable columns** — click header to sort (asc → desc → clear). Sorts per-level (siblings sorted among themselves).
- **Column visibility** — grid icon in header opens a picker to show/hide columns. Persisted to localStorage.
- **Column resize** — drag header border. Persisted to localStorage.
- **Cell selection** — click a cell to select. Arrow keys to navigate. Escape to clear.
- **Copy** — Ctrl+C / Cmd+C copies selected cell value to clipboard. Toast notification.
- **Progress bars** — configurable denominator field. Gradient fill.
- **Trend arrows** — automatic comparison. Green up, red down, gray dot.
- **Value coloring** — automatic positive/negative detection with configurable color mapping.
- **Parent aggregation** — sum/avg/min/max/count children values for parent rows.

---

## Project Structure

```
forecast-hierarchy/
├── projects/
│   └── forecast_hierarchy/              # Angular 17 project (Creatio)
│       ├── src/app/
│       │   ├── models/
│       │   │   └── hierarchy.model.ts   # Data types (framework-agnostic)
│       │   ├── components/
│       │   │   └── hierarchical-list/
│       │   │       ├── tree-builder.ts  # Flat → tree + aggregation
│       │   │       └── cell-renderer.ts # Format, progress, trend, color
│       │   ├── view-elements/
│       │   │   └── forecast-hierarchy/
│       │   │       ├── forecast-hierarchy.component.ts  # Main component
│       │   │       └── icon.svg
│       │   ├── test/
│       │   │   └── test.component.ts    # Standalone test page
│       │   └── app.module.ts
│       ├── webpack.config.js
│       └── package.json
├── packages/
│   └── UsrComponentPackage/
│       └── Files/
│           ├── descriptor.json          # Bootstrap registration
│           └── src/js/
│               ├── bootstrap.js         # Loads remoteEntry.js
│               └── forecast_hierarchy/  # Build output
├── src/                                 # Angular 21 sandbox (optional, for rapid dev)
└── docs/
```

---

## Creatio Page Integration Example

### Adding to a list page

1. Open the list page in the Freedom UI Designer
2. Drag "Forecast Hierarchy" from the component library onto the page
3. Save the designer
4. Add handlers to the page schema to feed data:

```javascript
define("UsrMyApp_ListPage", [], function() {
  return {
    viewModelConfigDiff: [
      // ... existing ...
      {
        "operation": "merge",
        "path": ["attributes"],
        "values": {
          "ForecastItems": {
            "isCollection": true,
            "modelConfig": { "path": "ForecastDS" },
            "viewModelConfig": {
              "attributes": {
                "FDS_Id": { "modelConfig": { "path": "ForecastDS.Id" } },
                "FDS_UsrName": { "modelConfig": { "path": "ForecastDS.UsrName" } },
                "FDS_UsrPlan": { "modelConfig": { "path": "ForecastDS.UsrPlan" } },
                "FDS_UsrFact": { "modelConfig": { "path": "ForecastDS.UsrFact" } },
                "FDS_UsrExpected": { "modelConfig": { "path": "ForecastDS.UsrExpected" } },
                "FDS_UsrExpectedYesterday": { "modelConfig": { "path": "ForecastDS.UsrExpectedYesterday" } },
                "FDS_UsrForecast": { "modelConfig": { "path": "ForecastDS.UsrForecast" } }
              }
            },
            "embeddedModel": {
              "name": "ForecastDS",
              "config": {
                "type": "crt.EntityDataSource",
                "config": { "entitySchemaName": "UsrMyApp" }
              }
            }
          }
        }
      }
    ],

    handlers: [
      {
        request: "crt.HandleViewModelAttributeChangeRequest",
        handler: async (request, next) => {
          const result = await next?.handle(request);
          if (request.attributeName !== "ForecastItems") return result;
          try { window._fhFeed?.(await request.$context.ForecastItems); }
          catch (e) { console.error(e); }
          return result;
        }
      },
      {
        request: "crt.HandleViewModelInitRequest",
        handler: async (request, next) => {
          const unwrap = (v) => (v != null && typeof v === "object"
            && "__zone_symbol__value" in v) ? v.__zone_symbol__value : v;

          const columns = [
            { id: "plan", field: "plan", label: "Plan", format: "number",
              defaultWidth: 140, minWidth: 80 },
            { id: "fact", field: "fact", label: "Fact", format: "number",
              defaultWidth: 140, minWidth: 80, progressOf: "plan" },
            { id: "expected", field: "expected", label: "Expected", format: "number",
              defaultWidth: 140, minWidth: 80, trendVs: "expectedYesterday" },
            { id: "forecast", field: "forecast", label: "Forecast", format: "number",
              defaultWidth: 140, minWidth: 80, trendVs: "expectedYesterday" }
          ];

          window._fhFeed = (items) => {
            if (!items || !items.length) return;
            const records = [];
            for (let i = 0; i < items.length; i++) {
              const a = items[i]?.attributes || {};
              records.push({
                id: String(unwrap(a.FDS_Id) || i),
                name: String(unwrap(a.FDS_UsrName) || ""),
                plan: Number(unwrap(a.FDS_UsrPlan)) || 0,
                fact: Number(unwrap(a.FDS_UsrFact)) || 0,
                expected: Number(unwrap(a.FDS_UsrExpected)) || 0,
                expectedYesterday: Number(unwrap(a.FDS_UsrExpectedYesterday)) || 0,
                forecast: Number(unwrap(a.FDS_UsrForecast)) || 0
              });
            }
            const fh = document.querySelector("usr-forecast-hierarchy");
            if (!fh) return;
            fh.hierarchy = { idField: "id", parentIdField: "parentId", nameField: "name" };
            fh.columns = columns;
            fh.data = records;
          };

          const result = await next?.handle(request);
          setTimeout(async () => {
            try { window._fhFeed?.(await request.$context.ForecastItems); }
            catch (e) { }
          }, 500);
          return result;
        }
      },
      {
        request: "crt.LoadDataRequest",
        handler: async (request, next) => {
          const result = await next?.handle(request);
          setTimeout(async () => {
            try { window._fhFeed?.(await request.$context.ForecastItems); }
            catch (e) { }
          }, 300);
          return result;
        }
      }
    ],
  };
});
```

---

## Development Workflow

### Build and deploy
```bash
cd projects/forecast_hierarchy && npm run build && cd ../..

SRC="packages/UsrComponentPackage/Files/src/js/forecast_hierarchy"
PKG="<creatio-app>/Terrasoft.Configuration/Pkg/UsrComponentPackage/Files/src/js/forecast_hierarchy"
CONTENT="<creatio-app>/conf/content/UsrComponentPackage/src/js/forecast_hierarchy"
rm -rf "$PKG" "$CONTENT"
cp -r "$SRC" "$PKG" && cp -r "$SRC" "$CONTENT"

clio push-pkg packages/UsrComponentPackage -e creatio-local
```

### Local testing
```bash
cd projects/forecast_hierarchy && ng serve --port 4200
```
Open http://localhost:4200 — same sandbox layout with config/data JSON editors.

### Schema changes
Edit schema files directly in `Pkg/*/Schemas/` — changes are picked up on page refresh (FSM). After changes in the Creatio UI designer: `clio pkg-to-file-system -e creatio-local`.
