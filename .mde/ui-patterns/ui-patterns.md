# UI Patterns Catalog (visual layer)

## About

This catalog is the **visual layer** of the UI: how the business composition model
(Page / Canvas / Panel — see the `page-composition` capability) is *rendered* on
screen. The model says *what* a page is (canvases of panels, each a source + purpose
+ services); this catalog says *how* each canvas and panel looks. **Lives in your
project at `.mde/ui-patterns/ui-patterns.md`** — edit freely; it is *your* project's
catalog, not method-canonical.

This template ships **shadcn/ui + Tailwind CSS + React** as the starting-point
component set. Replace, extend, or rewrite to match your stack; the stack itself is
declared in `.mde/ui-patterns/ui-design-system.md`.

Patterns attach to a **Canvas** or a **Panel**, rarely a whole Page:

- a **Panel pattern** renders one panel (one source) — e.g. a List panel as a *table*
  or *cards*; a Detail panel as a *form*.
- a **Canvas pattern** renders a coordination surface (its `type`) — *Standard*,
  *Timeline*, *Calendar*, *Kanban*, *Map*, *Dashboard*, *master-detail*.
- **Overlays** (modal, toast) are presentation, floating above any page.

A pattern is an **optional visual choice** with a sensible default (a List panel
defaults to a table). Choosing a different pattern changes the *look*, not the
business meaning. Patterns are built from the design-system components.

## Stack

shadcn/ui + Tailwind CSS + React. See the app's
`.mde/ui-patterns/ui-design-system.md` for stack details.

---

## Panel renderings (one source)

### table
- **renders:** a List panel
- **components:** `Table`, `Badge`, `Button`
Rows of records with columns, status badges, row actions. The default for a List panel.

### cards
- **renders:** a List panel
- **components:** `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`
A grid of cards instead of rows — when entities carry rich chip/tag data to scan.

### form
- **renders:** a Detail panel (Maintenance)
- **components:** `Input`, `Select`, `Textarea`, `Label`, `Button`
A form over **all editable fields** of the record (Maintenance = full edit). Status
(`Operate` services) render as separate actions, not fields.

### detail-readout
- **renders:** a Detail panel (Reference)
- **components:** `Card`, `Badge`, `Button`, `Label`
Labelled read-only fields with a Navigate action to the record's Maintenance panel.

### stat-readout
- **renders:** a Panel whose source is a View (summary/KPI)
- **components:** `Card`, `CardContent`
A summary number / KPI card for an aggregate View source.

---

## Canvas renderings (coordinate multiple sources)

### standard
- **renders:** a Standard canvas
- **components:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
The common maintenance surface: a primary Detail panel plus child List panels in tabs.
The default canvas rendering.

### master-detail
- **renders:** a Standard canvas with a SelectDetails link
- **components:** `Card`, `Table`, `Input`
List on one side, the selected record's Detail panel on the other; selecting updates
the detail inline.

### timeline
- **renders:** a Timeline canvas
- **components:** custom SVG
Records on a time axis (bars, milestones). Needs a date-range field per record.

### calendar
- **renders:** a Calendar canvas
- **components:** Calendar block
Records on a calendar grid. Needs a datetime field per record.

### kanban
- **renders:** a Kanban canvas
- **components:** `Card`, `Badge`
Records grouped into columns by a workflow-state field; drag/transfer between columns.

### dashboard
- **renders:** a Dashboard canvas
- **components:** Dashboard blocks
A grid of stat-readout panels + summaries; read-only overview.

### map
- **renders:** a Map canvas
- **components:** custom
Records positioned geographically. Needs a location field per record.

---

## Overlays (presentation, above any page)

### confirm-dialog
- **components:** `Dialog`, `DialogHeader`, `DialogContent`, `DialogFooter`, `Button`
Modal confirmation before a destructive/irreversible `Operate` action.

### notification-toast
- **components:** `Toast`, `ToastTitle`, `ToastDescription`
Transient success/error feedback after a save, submit, or operation.

---

## Selection guide

The composition model picks the **canvas type** and **panel kinds**; this catalog picks
their **rendering**, defaulting sensibly:

| Model unit | Default rendering | Alternatives |
|---|---|---|
| List panel | table | cards |
| Detail panel (Maintenance) | form | — |
| Detail panel (Reference) | detail-readout | — |
| Panel over a View | stat-readout | — |
| Standard canvas | standard | master-detail |
| Timeline / Calendar / Kanban / Map canvas | the matching renderer | — |
| Dashboard canvas | dashboard | — |
