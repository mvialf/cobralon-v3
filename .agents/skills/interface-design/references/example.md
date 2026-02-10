# Craft in Action

This shows how the subtle layering principle translates to real decisions. Learn the thinking, not the code. Your values will differ — the approach won't.

---

## The Subtle Layering Mindset

Before looking at any example, internalize this: **you should barely notice the system working.**

When you look at Vercel's dashboard, you don't think "nice borders." You just understand the structure. When you look at Supabase, you don't think "good surface elevation." You just know what's above what. The craft is invisible — that's how you know it's working.

---

## Example: Dashboard with Sidebar and Dropdown

### The Surface Decisions

Use the project's surface tokens to create elevation:

```
bg-background    → base canvas (Level 0)
bg-card          → cards, panels (Level 1)
bg-popover       → dropdowns, popovers (Level 2)
bg-muted         → recessed/inset areas
bg-sidebar       → branded/dark areas (if the project defines it)
```

The token system already encodes subtle elevation shifts. Don't override them with arbitrary colors.

**What NOT to do:** Don't use `bg-[#xxx]` to create custom surface levels. Use what exists.

### The Border Decisions

Use `border-border` for standard separation. Use opacity modifiers (`border-border/50`) for softer borders. The project's border token is already tuned to be subtle.

**The test:** Look at your interface from arm's length. If borders are the first thing you notice, use a lower opacity modifier. If you can't find where regions end, use the full-opacity token.

### The Sidebar Decision

The project defines dedicated `--sidebar-*` tokens. Use them when you need a branded/dark area — these tokens are designed to work as a cohesive set (`bg-sidebar`, `text-sidebar-foreground`, `text-sidebar-primary`).

For sidebars that should blend with content, use `bg-background` with `border-border` separation instead.

### The Dropdown Decision

Use `bg-popover` for dropdowns — it's a dedicated token for floating surfaces. Don't reuse `bg-card` for dropdowns; the popover token exists precisely to differentiate floating elements from inline surfaces.

Use `shadow-md` or `shadow-lg` from the project's shadow scale for floating elements — they need more visual lift than inline cards.

---

## Example: Form Controls

### Input Background Decision

Inputs use `bg-transparent` with `border-input` — the project's input token is already tuned for interactive borders. Don't add custom backgrounds to inputs unless the token system provides one.

### Focus State Decision

The project defines `--ring` for focus states. Use `ring-ring` with appropriate opacity. The existing shadcn/ui components already implement focus states via `focus-visible:ring-ring` — stay consistent with that pattern.

---

## Adapt Within the Token System

The project supports light and dark mode via token overrides in `globals.css`. Both modes are already defined — don't create custom mode-specific values.

If you need to express warmth, coolness, or different moods, do it through:
- **Token selection** — `bg-sidebar` vs `bg-background` vs `bg-muted` create different feels
- **Opacity modifiers** — `text-foreground/80` vs `text-foreground` vs `text-muted-foreground`
- **Layout and spacing** — density and proportion carry mood without new colors

**The principle is constant:** work within the system, express through combination.

---

## The Craft Check

Apply the squint test to your work:

1. Blur your eyes or step back
2. Can you still perceive hierarchy?
3. Is anything jumping out at you?
4. Can you tell where regions begin and end?

If hierarchy is visible and nothing is harsh — the subtle layering is working.
