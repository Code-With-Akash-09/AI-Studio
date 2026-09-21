---
name: ui-design-native
description: React Native / iOS / Android design and UX rules — touch targets, safe areas, platform conventions, accessibility, and motion. Use when designing or reviewing React Native UI, handling touch interactions, implementing platform-specific patterns, or ensuring accessibility on mobile. For inline styles and animation library priority → see react-native-styling skill.
---

# UI Design — Native

> Inline styles, shadows, and animation library priority → see `react-native-styling` skill.
> Web design rules → see `ui-design-web` skill.

## Touch Interaction (CRITICAL)

- **Minimum touch target:** 44×44pt (iOS) / 48×48dp (Android)
- Use `hitSlop` to extend tap area when the visual element is smaller than the minimum
- **Minimum gap** between touch targets: 8pt/8dp
- All interactive elements provide **press feedback within 80–150ms** (ripple, opacity change, or elevation shift)
- Scale feedback: `scale(0.95–1.05)` on press, restore on release
- Never rely on hover-only interactions — use tap/press for all primary actions

**Incorrect — small icon without hit area expansion:**
```tsx
<Pressable onPress={handleClose}>
  <Icon name="close" size={16} /> {/* ✗ 16pt is too small */}
</Pressable>
```

**Correct:**
```tsx
<Pressable onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
  <Icon name="close" size={16} /> {/* ✓ effective tap area is 40pt+ */}
</Pressable>
```

## Safe Areas

- All fixed headers, tab bars, and bottom CTA bars must respect safe zones
- `contentInsetAdjustmentBehavior="automatic"` handles this on ScrollView/FlatList
- Keep primary touch targets away from notch, Dynamic Island, gesture bar, screen edges
- Never block system gestures: Control Center swipe, iOS back swipe, Android predictive back

## Platform Conventions

**iOS:**
- Bottom Tab Bar for top-level navigation (Apple HIG)
- Bottom nav max 5 items, always show both icon and text label
- Support iOS swipe-back gesture — never conflict with it
- Support Dynamic Type — test at largest accessibility text size, avoid truncation
- Haptic feedback for confirmations and important actions via `expo-haptics` — iOS only, avoid overuse

**Android:**
- Support Android predictive back gesture
- Material ripple effect on press for interactive elements

**Both platforms:**
- Back navigation must be predictable — never silently reset the navigation stack
- Preserve scroll position when navigating back
- Deep-link all key screens

## Accessibility (Mobile)

- `accessibilityLabel` on all icon-only buttons and meaningful images
- `accessibilityRole` set on all interactive elements (`button`, `link`, `header`, etc.)
- `accessibilityState` set for dynamic states: `{ selected: true }`, `{ disabled: true }`, `{ expanded: false }`
- Logical VoiceOver/TalkBack reading order — matches visual order
- Don't convey information by color alone — always include icon or text alongside color

## Animation & Motion

- Micro-interactions: 150–300ms, complex transitions ≤400ms
- Spring/physics-based curves over linear easing — `type: "spring"` in moti, `withSpring` in reanimated
- Exit animations shorter than enter (~60–70% of enter duration) — feels more responsive
- All animations must be interruptible — user tap immediately cancels in-progress animation
- Respect `Reduce Motion` accessibility setting — provide static alternatives

> For which animation library to use (reanimated → moti → built-in priority order) → see `react-native-styling` skill.

## Pre-Delivery Checklist

- [ ] All tap areas ≥44×44pt (iOS) or ≥48×48dp (Android)
- [ ] Press feedback appears within 80–150ms on all interactive elements
- [ ] Safe areas respected on all fixed/sticky bars
- [ ] System gestures (swipe-back, home bar) not blocked
- [ ] `accessibilityLabel` on icon-only buttons and images
- [ ] Dynamic Type tested at largest size — no truncation
- [ ] Haptics iOS-only and conditionally applied
- [ ] Animations are interruptible and respect Reduce Motion
