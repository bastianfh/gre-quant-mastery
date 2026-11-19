---
name: glass-ui
description: Enforces a translucent, spatial frosted-glass UI with minimalistic muted accents. Use whenever creating or refactoring frontend components, layouts, or styles.
---

# Glass UI Design System Rules

When modifying or building UI in this repository:
1. **No standard AI clichés**: Never use neon purple/blue gradients, generic SaaS white cards, heavy drop shadows, or robotic chat-bubble layouts.
2. **Spatial Translucent Shell**: Wrap the app in the `.app-shell` 3-column layout (Left: GRE Quant topics/navigation, Center: Active problem or bento dashboard, Right: Scratchpad, formula hints, or recent attempt history).
3. **Minimalistic Color Hierarchy**: Keep 85% of the interface in dark frosted glass (`--glass-shell`, `--glass-card`, `1px solid var(--glass-border)`). Reserve solid color strictly for high-signal metric bento cards (`.bento-card--warm`, `--coral`, `--sage`, `--mist`) using dark ink (`#111318`) for legibility.
4. **Typography**: Use `font-variant-numeric: tabular-nums` for all timers, GRE scores, and question counters. Pair crisp sans-serif UI labels with clean math rendering.
5. **Preserve Logic**: Never alter state management, scoring algorithms, or question data while refactoring styles.
