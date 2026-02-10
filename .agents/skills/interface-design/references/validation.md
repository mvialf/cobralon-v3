# Memory Management

When and how to update `.interface-design/system.md`.

## When to Add Patterns

Add to system.md when:
- Component used 2+ times
- Pattern is reusable across the project
- Has specific measurements worth remembering

## Pattern Format

```markdown
### Button Primary
- Height: 36px
- Padding: 12px 16px
- Radius: 6px
- Font: 14px, 500 weight
```

## Don't Document

- One-off components
- Temporary experiments
- Variations better handled with props

## Pattern Reuse

Before creating a component, check system.md:
- Pattern exists? Use it.
- Need variation? Extend, don't create new.

Memory compounds: each pattern saved makes future work faster and more consistent.

---

# Validation Checks

Check consistency against the project's `globals.css` and system.md (if it exists):

**Tokens** — Does every visual value trace to a token from `globals.css`? Search for raw hex, oklch, rgba, or arbitrary Tailwind values (`bg-[...]`, `text-[...]`). If any exist, replace with token references.

**Spacing** — All values multiples of the project's `--spacing` base?

**Depth** — Using the project's shadow token scale consistently? (shadow-sm, shadow-md, etc.)

**Colors** — Using Tailwind classes that map to CSS variables, not inline values?

**Radius** — Using the project's radius scale (rounded-sm, rounded-md, rounded-lg, rounded-xl)?

**Patterns** — Reusing documented patterns instead of creating new?
