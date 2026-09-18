# Kiro-Style JavaScript and CSS Modules Migration

## Goal
Convert the existing CRM application to standard React JavaScript/JSX with component-scoped CSS Modules, while preserving the current UI and all behavior exactly.

The stated Kiro structure will be the reference:

```text
Component.jsx
Component.module.css
```

Global tokens and base rules will live in `globals.css`.

## Confirmed scope
- The source currently contains 139 `.tsx` files and 34 `.ts` files.
- Styling is tightly coupled to Tailwind across pages, shared controls, and feature components.
- Routes and authentication are centralized in the application root.
- Data access and realtime behavior are primarily contained in hooks and the existing backend client.
- The generated backend client, preview auth storage, and generated database types are protected files and will remain generated TypeScript artifacts; application code will no longer depend on TypeScript-only imports where avoidable.

## Migration plan

### 1. Establish a visual and behavioral baseline
- Capture the current desktop, tablet, and mobile appearance of every route available to the test session.
- Record critical states: loading, empty, error, dialogs, menus, forms, pipeline columns, chat windows, notifications, and admin screens.
- Record route access, authentication redirects, form behavior, and core realtime/data workflows before changing files.

### 2. Create the global CSS foundation
- Replace the Tailwind-dependent global stylesheet with `globals.css`.
- Preserve every existing color, typography, radius, shadow, dark-mode, pipeline, sidebar, WhatsApp, and chart token.
- Recreate current base element rules, reusable keyframes, loading animations, overlay animations, and exact responsive breakpoints in normal CSS.
- Keep only truly global styles global; component styles move into CSS Modules.

### 3. Convert shared utilities and non-visual logic
- Rename ordinary `.ts` application files to `.js` and remove interfaces, type aliases, generics, assertions, annotations, and type-only imports.
- Replace TypeScript domain types with runtime constants or JSDoc only where they improve clarity without affecting behavior.
- Preserve all backend queries, payloads, retries, realtime subscriptions, caching, formatting, and business rules verbatim.
- Keep generated backend integration files untouched so regeneration and authentication continue to work.

### 4. Convert the shared UI library first
- Convert shared controls from `.tsx` to `.jsx`, each with a matching `.module.css` where it has visual styling.
- Recreate every existing button, badge, form control, table, calendar, navigation, dialog, popover, toast, sheet, tooltip, and menu style in CSS Modules.
- Replace Tailwind/CVA variant strings with explicit JavaScript variant-to-class mappings.
- Recreate Radix open/close, side, checked, disabled, group, peer, and data-state selectors in CSS without changing interaction behavior.
- Migrate the complex sidebar, chart, form, carousel, and overlay primitives only after their simpler dependencies are stable.

### 5. Convert hooks and feature logic
- Convert authentication and protected-route logic together and verify session restoration and role checks remain unchanged.
- Convert lead, appointment, artist, chat, Instagram, inventory, design, review, notification, template, consent, and completion hooks to JavaScript.
- Preserve all request shapes, table names, filters, realtime channels, storage behavior, error handling, and return contracts.

### 6. Convert feature components by domain
Migrate one domain at a time, creating one CSS Module per styled component:

1. Shared navigation and route guards
2. Appointment components
3. Inventory components
4. Design components
5. Review components
6. Settings components
7. WhatsApp template and automation components
8. Admin components
9. CRM pipeline, lead, notification, and reporting components
10. WhatsApp and Instagram chat components

For each component:
- Rename `.tsx` to `.jsx`.
- Remove TypeScript syntax only; keep JSX structure and event logic intact.
- Translate every utility class into an equivalent local CSS class.
- Preserve dynamic styles where values genuinely come from runtime data.
- Preserve Framer Motion props and all transitions exactly.
- Recreate all responsive rules at the same breakpoints.

### 7. Convert pages and application entry files
- Convert all route pages to `.jsx` after their dependencies are migrated.
- Convert the application root and entry file last.
- Keep every route path, redirect, provider, protected page, and public page unchanged.
- Update imports only for renamed files and stylesheets.

### 8. Remove Tailwind and TypeScript application tooling
Only after visual and behavioral parity is confirmed:
- Remove Tailwind directives, configuration, plugins, and Tailwind-only dependencies.
- Remove `tailwind-merge` after no utility strings remain.
- Convert applicable project configuration files from TypeScript to JavaScript.
- Update linting and component configuration for JSX/CSS Modules.
- Remove obsolete TypeScript application configuration only if it is no longer required by protected generated files.
- Remove dead legacy styles only after confirming they are unused.

### 9. Verification and regression pass
- Confirm no `.tsx` application files or Tailwind class strings remain outside protected generated integration files.
- Compare screenshots against the baseline at desktop, tablet, and mobile sizes.
- Verify dialogs, dropdowns, popovers, tabs, forms, scrolling, animations, dark theme, and responsive layouts.
- Verify authentication, protected routes, CRM lead actions, appointment flows, WhatsApp/Instagram chat, notifications, reviews, inventory, designs, templates, and admin pages.
- Run the existing tests and the project validation checks after each migration group and once more at completion.

## Technical safeguards
- Tailwind and CSS Modules will temporarily coexist during migration; Tailwind will be removed only after the last dependent component is converted.
- File conversion will follow dependency order: globals/utilities → shared controls → hooks → feature components → pages → app entry.
- No database migrations, backend function changes, route changes, content edits, or behavior refactors are included.
- No visual cleanup or redesign is included, even where the current code contains inconsistent or hardcoded styles.
- Generated backend integration files are excluded from manual conversion because the platform owns and regenerates them.

## Completion criteria
- Application-owned React files use `.jsx` and JavaScript syntax.
- Every styled visual component has a matching `.module.css` file.
- Global tokens and base rules are in `globals.css`.
- Tailwind is no longer used by migrated application code.
- Current visuals, responsive behavior, animations, routes, authentication, forms, backend operations, and business logic remain unchanged.
