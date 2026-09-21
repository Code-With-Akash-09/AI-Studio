---
name: excalidraw
description: Generates Excalidraw diagram files (.excalidraw) from natural language descriptions. Outputs to .artifacts/ with ALL_CAPS_SNAKE_CASE filenames. Use when asked to create a diagram, flowchart, architecture diagram, mind map, sequence diagram, ER diagram, or any visual representation of a system, flow, or relationship.
---

# Excalidraw Diagram Generator

## Output Rules

- Feature-specific diagrams: `.artifacts/features/<entityName>/DIAGRAM_NAME.excalidraw`
- General/cross-cutting diagrams: `.artifacts/general/DIAGRAM_NAME.excalidraw`
- Filename: **ALL_CAPS_SNAKE_CASE** + `.excalidraw` (e.g. `AUTH_FLOW.excalidraw`, `DB_SCHEMA.excalidraw`)

## Supported Diagram Types

| User says | Diagram type |
|---|---|
| "workflow", "process", "steps", "decision" | Flowchart |
| "relationship", "connections", "dependencies" | Relationship diagram |
| "mind map", "concepts", "brainstorm" | Mind map |
| "architecture", "system", "components", "modules" | Architecture diagram |
| "data flow", "data processing", "DFD" | Data Flow Diagram |
| "swimlane", "business process", "actors", "responsibilities" | Swimlane / Business Flow |
| "class", "inheritance", "OOP", "object model" | Class diagram |
| "sequence", "interaction", "messages", "timeline" | Sequence diagram |
| "database", "entity", "relationship", "ER", "schema" | ER diagram |

## Workflow

1. Identify diagram type from user's description
2. Extract key elements (entities, steps, relationships)
3. Generate `.excalidraw` JSON — see [references/excalidrawSchema.md](references/excalidrawSchema.md)
4. Save to correct `.artifacts/` path
5. Confirm: diagram type, element count, output path

## Key Generation Rules

- All text elements: `fontFamily: 5` (Excalifont) — required for consistent rendering
- Element IDs: unique per element — timestamp + random string pattern
- Spacing: 200–300px horizontal gap, 100–150px vertical gap between elements
- Max 20 elements per diagram — offer to split into multiple diagrams if more needed
- Color scheme: primary `#a5d8ff` (blue), secondary `#b2f2bb` (green), highlight `#ffd43b` (yellow), alert `#ffc9c9` (red)

> Full JSON schema → [references/excalidraw-schema.md](references/excalidraw-schema.md)
> Element type properties → [references/element-types.md](references/element-types.md)
