# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Started as the author's own personal money app on iPhone; the author now wants to share it with other people, who install it on their own phones and use it on their own, each with separate data. Users are Spanish speakers in Colombia, managing everyday personal money in COP, mostly logging small expenses on the go, one-handed, several times a day.

## Product Purpose

A personal money diary on the phone. It must answer three questions:

1. **How much have I spent this month?** Logging each movement has to be fast, and the month's status has to be clear at a glance.
2. **Where is my money going?** A breakdown by category.
3. **Am I staying within my limit / saving?** Limits and savings goals are wanted but **not built yet** (the data model already has `presupuestos`, `metas`, `cuentas` and `recurrentes`, none of them exposed).

Success: someone can log an expense in seconds and trust every number the app shows.

## Positioning

Private by design: no account, no cloud, no server. Data lives only on the phone, and the user owns the backups (the share-sheet export on iPhone). Free, in Spanish and in pesos.

## Operating Context

- Installed as a PWA from Safari on iPhone (standalone mode, safe areas).
- Hosted free on GitHub Pages; the author uploads files by hand through the GitHub web interface (no git installed locally). Every update bumps `VERSION` in `service-worker.js`.
- Works offline through the service worker.
- Backups are JSON files that the user exports and imports.

## Capabilities and Constraints

- Views: Registro (add and list movements), Gráficos (month summary, donut, category filter), Ahorro (projection, goals, savings places), Viajes (trip planner: days × budget per day, money taken out of the available balance, trip expenses by category and per day, return of leftovers), Ajustes (expense and income categories, backup and import).
- Movements are a gasto or an ingreso, with an amount, a category, a date and an optional note; editing happens in a bottom sheet; deleting has Undo.
- Default expense categories: Comida, Transporte, Hogar, Salud, Ocio, Otro.
- **Binding constraints:**
  - The name stays "Mis Finanzas".
  - Data stays only on the phone (localStorage); no accounts, cloud or backend.
  - Static files only (HTML/CSS/JS), free on GitHub Pages, with no build step.
  - Everything in Spanish, amounts in Colombian pesos (COP, `$45.000` format).
- **Undecided:** limits and budgets, savings goals, multiple accounts, recurring movements.

## Brand Commitments

- Name: Mis Finanzas (short name: Finanzas).
- Voice: plain, warm Colombian Spanish addressed to "tú" ("Toca un movimiento…", "Haz un respaldo…").
- Existing assets: app icons `icon-180.png`, `icon-192.png`, `icon-512.png`.
- Look (the user's choice, 2026-11-19): in the style of digital banks like Revolut, without copying their name, logo or assets. Manrope (self-hosted in `assets/fonts/`). The user then asked for **dark, minimalist colours**: one dark theme only (no light mode), blacks and greys, white primary buttons, and a blue accent used sparingly (active tab, focus, a faint glow behind the balance). Red and green stay reserved for expenses and income.

## Evidence on Hand

No real users, testimonials or usage data. Do not invent any.

## Product Principles

1. **Numbers you can trust.** One meaning per number, always labelled with the period it covers.
2. **Logging in seconds.** Adding an expense is the main job; nothing gets in its way.
3. **Your data, your phone.** Privacy and backups are a feature, not fine print.
4. **Made for someone else to understand.** It will be shared, so it has to be clear to a first-time user without explanations.

## Accessibility & Inclusion

No specific standard has been confirmed. The app is used one-handed on a phone, so touch targets and readable contrast matter.
