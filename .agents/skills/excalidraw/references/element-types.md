# Excalidraw — Element Types Reference

## Shapes

| Type | Use for | Notes |
|---|---|---|
| `rectangle` | Entities, steps, modules, containers | Most common element |
| `diamond` | Decision points, conditions | Used in flowcharts |
| `ellipse` | Start/end nodes, emphasis | Oval shape |
| `arrow` | Directed connections | Has `startArrowhead`/`endArrowhead` |
| `line` | Undirected connections | No arrowheads |
| `text` | Standalone labels | Must use `fontFamily: 5` |

## Arrow Arrowhead Values

- `"arrow"` — filled arrowhead (most common)
- `"triangle"` — triangle arrowhead
- `"dot"` — filled circle
- `"bar"` — flat bar (aggregation in class diagrams)
- `null` — no arrowhead

## Fill Styles

- `"solid"` — filled with `backgroundColor`
- `"hachure"` — hatched pattern
- `"cross-hatch"` — cross-hatched
- `"dots"` — dotted fill
- `"none"` — no fill (transparent)

## Roundness

- `{ "type": 3 }` — rounded corners (default for rectangles)
- `null` — sharp corners
- `{ "type": 2 }` — more curved (for paths)

## Color Palette

| Role | Color |
|---|---|
| Primary entities | `#a5d8ff` (light blue) |
| Secondary entities | `#b2f2bb` (light green) |
| Central / highlight | `#ffd43b` (yellow) |
| Alert / warning | `#ffc9c9` (light red) |
| Neutral | `#f8f9fa` (light gray) |
| Stroke | `#1e1e1e` (near black) |

## Diagram-Specific Patterns

### Flowchart
- Start/end: `ellipse` with `backgroundColor: "#b2f2bb"`
- Steps: `rectangle`
- Decisions: `diamond`
- Connections: `arrow` with `endArrowhead: "arrow"`

### ER Diagram
- Entities: `rectangle` with rounded corners
- Primary key fields: text with underline convention in label (e.g. `PK: id`)
- Relations: `arrow` or `line` with multiplicity labels
- Many-to-many junction: `rectangle` with `strokeStyle: "dashed"`

### Class Diagram
- Classes: `rectangle` divided by `line` separators (header / attributes / methods)
- Inheritance: `arrow` with `endArrowhead: "triangle"` (hollow — use `fillStyle: "none"`)
- Association: `arrow` with `endArrowhead: "arrow"`
- Aggregation: `line` with `startArrowhead: "bar"`

### Sequence Diagram
- Actors: `rectangle` at top
- Lifelines: `line` extending downward from actors
- Messages: `arrow` between lifelines (horizontal)
- Activation boxes: `rectangle` on lifeline (narrow, tall)
- Return messages: `arrow` with `strokeStyle: "dashed"`

### Architecture Diagram
- Services/modules: `rectangle` with color-coding by layer
- External systems: `rectangle` with `fillStyle: "hachure"`
- Boundaries: large `rectangle` with `fillStyle: "none"` as container
- Data flow: `arrow` with labels
