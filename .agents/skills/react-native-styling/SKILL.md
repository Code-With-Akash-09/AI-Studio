---
name: react-native-styling
description: React Native styling rules — inline styles, safe areas, shadows, visual effects (gradients, filters, blend modes), spacing, and animation library priority order (reanimated → moti → built-in). Use when styling React Native components, handling safe areas, adding shadows or gradients, applying filters, or implementing animations in any Expo or React Native project.
---

# React Native Styling

> Routing, navigation, and library preferences → see `react-native-ui` skill.

## Styling Fundamentals

- Use **inline styles** — not `StyleSheet.create()` unless reusing styles provides a measurable performance benefit
- CSS and Tailwind are **not supported** in React Native — use inline style objects only
- Prefer `flex gap` over margin/padding for spacing between elements
- `borderCurve: 'continuous'` for rounded corners (unless capsule shape)

**ScrollView padding — use `contentContainerStyle`:**
```tsx
// Correct
<ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

// Incorrect — clips content
<ScrollView style={{ padding: 16 }}>
```

## Safe Areas

- Always account for safe areas — apply `contentInsetAdjustmentBehavior="automatic"` on `ScrollView`, `FlatList`, `SectionList`
- Ensure both **top and bottom** insets are handled
- Keep primary touch targets away from notch, Dynamic Island, gesture bar, and screen edges

```tsx
<ScrollView contentInsetAdjustmentBehavior="automatic">
  {/* content */}
</ScrollView>
```

## Shadows

Use CSS `boxShadow` — never legacy React Native shadow props or `elevation`.

```tsx
// Correct — single layer
<View style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }} />
<View style={{ boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} />

// Correct — multiple layers
<View style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.05)" }} />

// Incorrect — legacy props
<View style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 }} />
```

## Visual Effects

**Gradients** — use `experimental_backgroundImage` with a CSS-like string:
```tsx
<View style={{ experimental_backgroundImage: "linear-gradient(to right, #6366f1, #8b5cf6)" }} />
<View style={{ experimental_backgroundImage: "linear-gradient(to right, red 20%, orange 20% 40%, yellow 40% 60%, green 60% 80%, blue 80%)" }} />
```

**Filters** — use `filter` with a CSS-like string or array of objects:
```tsx
<View style={{ filter: "blur(4px) brightness(0.8)" }} />
<View style={{ filter: [{ blur: 4 }, { brightness: 0.8 }] }} />
```
- Full support: **Android only** (blur requires Android 12+)
- iOS: only `brightness` and `opacity` filters are supported

**Blend modes** — use `mixBlendMode` to blend an element with its background:
```tsx
<View style={{ mixBlendMode: "multiply" }} />
// Use isolation: "isolate" on a parent to contain blending to that container
<View style={{ isolation: "isolate" }}>
  <View style={{ mixBlendMode: "overlay" }} />
</View>
```

## Spacing

Use `gap`, `rowGap`, and `columnGap` for flex spacing — prefer over margin between siblings:
```tsx
<View style={{ flexDirection: "row", gap: 12 }} />
<View style={{ rowGap: 6, columnGap: 28 }} />
```

## Text

- Add `selectable` prop to every `<Text>` displaying important data or error messages
- Use `{ fontVariant: ['tabular-nums'] }` for counters, prices, and data columns

## Animation Priority Order

**Always follow this order. Never skip a level without explicitly stating a technical reason.**

### 1. `react-native-reanimated` — always try first

Best performance (UI thread), full feature set, most expressive.

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated"

const opacity = useSharedValue(0)
const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

opacity.value = withSpring(1)

return <Animated.View style={[styles.box, animatedStyle]} />
```

### 2. `moti` — when reanimated is too verbose

Use for simple declarative animations where reanimated's API is overkill.

```tsx
import { MotiView } from "moti"

<MotiView
  from={{ opacity: 0, translateY: 10 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: "spring" }}
/>
```

### 3. Built-in `Animated` API — last resort only

Only if reanimated and moti are genuinely unavailable or technically blocked. **State the reason.**

```tsx
// Only when reanimated/moti cannot be used — state why
const fadeAnim = useRef(new Animated.Value(0)).current
Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
```

**Incorrect — skipping to built-in without reason:**
```tsx
// ✗ reanimated is installed and available — no reason to use Animated
const anim = useRef(new Animated.Value(0)).current
```

**Always add entering/exiting animations for state changes.** Use reanimated's `entering`/`exiting` props or moti's `from`/`animate` for mount/unmount transitions.
