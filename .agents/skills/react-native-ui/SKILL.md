---
name: react-native-ui
description: "Complete guide for building Expo/React Native apps — routing, navigation, library preferences, responsiveness, and behavior rules. Use when working on any Expo or React Native project, setting up navigation, choosing libraries, or structuring routes. Filename convention override: camelCase (not kebab-case)."
---

# React Native UI

> Styling, shadows, safe areas, and animation priority → see `react-native-styling` skill.

## Routing Fundamentals

- Routes belong in `app/` directory only — never co-locate components, types, or utilities there
- Always have a route matching `/` (may be inside a group)
- Remove old route files when moving or restructuring navigation
- Always use `_layout.tsx` to define stacks
- **Filenames:** camelCase — override of Expo's default kebab-case preference

**Route groups and framework conventions (exempt from camelCase):**
```
app/
├── _layout.tsx          ← root layout with NativeTabs
├── (auth)/              ← route group
│   ├── _layout.tsx
│   └── login.tsx        ← camelCase ✓ (not login.tsx is already camelCase)
├── (app)/
│   ├── _layout.tsx
│   └── (index,search)/
│       ├── _layout.tsx
│       ├── index.tsx
│       └── i/[id].tsx   ← dynamic segment
└── +not-found.tsx
```

## Library Preferences

Always use these. Never use the deprecated alternatives.

| Use | Never use |
|---|---|
| `expo-audio` | `expo-av` |
| `expo-video` | `expo-av` |
| `expo-image` with `source="sf:name"` for SF Symbols | `expo-symbols`, `@expo/vector-icons` |
| `react-native-safe-area-context` | React Native built-in `SafeAreaView` |
| `process.env.EXPO_OS` | `Platform.OS` |
| `React.use` | `React.useContext` |
| `expo-glass-effect` | custom blur implementations |

## Responsiveness

- Use `useWindowDimensions` — never `Dimensions.get()`
- Apply `contentInsetAdjustmentBehavior="automatic"` on `ScrollView`, `FlatList`, `SectionList`
- `ScrollView` should almost always be the first child inside a route component
- Use flexbox for all layouts — never `Dimensions` API for positioning

## Navigation

```tsx
// Basic navigation
import { Link } from "expo-router"
<Link href="/settings" />

// Custom trigger with preview (add whenever possible)
<Link href="/item/123">
  <Link.Trigger>
    <Pressable><Card /></Pressable>
  </Link.Trigger>
  <Link.Preview />
</Link>

// Context menu on long-press
<Link href="/item/123" asChild>
  <Link.Trigger><Pressable><Card /></Pressable></Link.Trigger>
  <Link.Menu>
    <Link.MenuAction title="Share" icon="square.and.arrow.up" onPress={handleShare} />
    <Link.MenuAction title="Delete" icon="trash" destructive onPress={handleDelete} />
  </Link.Menu>
</Link>
```

**Modals and sheets:**
```tsx
// Modal — prefer over custom modal components
<Stack.Screen name="modal" options={{ presentation: "modal" }} />

// Form sheet
<Stack.Screen name="sheet" options={{
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1.0],
  contentStyle: { backgroundColor: "transparent" }, // liquid glass on iOS 26+
}} />
```

- Always set page title via `Stack.Screen options={{ title: "..." }}` — never a custom text element on the page
- Use `headerLargeTitle: true` for primary list screens

## Behavior Rules

- Use `expo-haptics` conditionally on iOS for confirmations and important actions
- Add `<Text selectable />` prop to any text containing data the user might want to copy
- Never use intrinsic HTML elements (`img`, `div`) outside webview or Expo DOM components
- Format large numbers: `1.4M`, `38k`
- Consider adding `Link.Preview` to card/list items for iOS conventions

## Common Layout Pattern

```tsx
// app/_layout.tsx
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs"

const Layout = () => (
  <NativeTabs>
    <NativeTabs.Trigger name="(index)">
      <Icon sf="list.dash" />
      <Label>Items</Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="(search)" role="search" />
  </NativeTabs>
)

export default Layout
```
