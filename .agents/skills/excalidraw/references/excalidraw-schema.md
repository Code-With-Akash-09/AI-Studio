# Excalidraw — Schema Reference

## File Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

## Element Base Properties

All elements share these properties:

```json
{
  "id": "unique-id-here",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 160,
  "height": 60,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 3 },
  "seed": 12345,
  "version": 1,
  "versionNonce": 12345,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1700000000000,
  "link": null,
  "locked": false
}
```

## Rectangle (entities, steps)

```json
{
  "type": "rectangle",
  "width": 160,
  "height": 60
}
```

## Diamond (decision points)

```json
{
  "type": "diamond",
  "width": 120,
  "height": 80
}
```

## Ellipse (alternative emphasis)

```json
{
  "type": "ellipse",
  "width": 140,
  "height": 60
}
```

## Text

```json
{
  "type": "text",
  "text": "Label here",
  "fontSize": 16,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": null,
  "originalText": "Label here",
  "lineHeight": 1.25,
  "width": 120,
  "height": 20
}
```

**Important:** `fontFamily: 5` is required for all text elements (Excalifont).

## Arrow (connections)

```json
{
  "type": "arrow",
  "points": [[0, 0], [150, 0]],
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "startBinding": {
    "elementId": "source-element-id",
    "focus": 0,
    "gap": 1
  },
  "endBinding": {
    "elementId": "target-element-id",
    "focus": 0,
    "gap": 1
  }
}
```

## ID Generation

```js
const id = Date.now().toString(36) + Math.random().toString(36).substring(2)
// Example: "lp4x7a2m8k3"
```

## Layout Guidelines

| Diagram type | Horizontal gap | Vertical gap |
|---|---|---|
| Flowchart | 200px | 120px |
| Architecture | 250px | 150px |
| ER diagram | 300px | 180px |
| Mind map | Radial: center + 300px radius | — |
| Sequence | 200px between lifelines | 80px between messages |

## Radial Layout (Mind Maps)

```js
const angle = (2 * Math.PI * index) / branchCount
const x = centerX + radius * Math.cos(angle)
const y = centerY + radius * Math.sin(angle)
```
