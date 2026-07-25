# 04 - Navigation: Expo Router vs React Navigation

ACTION step 4. Choose and wire navigation. **Lead with Expo Router** (file-based, the current Expo default); document the React Navigation decision rather than committing the app blindly. Demonstrated in `examples/01-greenfield-app-setup.md`.

Source note: `research/navigation/2026-06-29-expo-router-vs-react-navigation.md`. Version pin: Expo Router v7 (SDK 55+; `guides/00-principles.md`).

## The default: Expo Router (file-based)

Expo Router is Expo's open-source file-based routing library for universal React Native + web apps. A file added to the `app/` directory automatically becomes a route. The official docs recommend it for new apps.

> "Expo Router is an open-source routing library for Universal React Native applications built with Expo" and "a file-based router for React Native and web applications." "When a file is added to the app directory, the file automatically becomes a route in your navigation." "if you are building a new app, we recommend using Expo Router for all the features described above." (official docs)

Pin examples to **Expo Router v7** (ships with SDK 55+).

### How it relates to React Navigation (state it precisely)

The official intro frames the two as alternative authoring models. Nearly every community source says Expo Router is built on React Navigation. Both are reconcilable. State it this way to be accurate:

> Expo Router uses React Navigation's navigators, gesture handling, and native stack under the hood, while presenting a file-based authoring model that manages the routing config (and deep linking) automatically from your folder structure.

So choosing Expo Router does not throw away React Navigation; it layers a file-based convention and automatic deep linking on top of it.

## The decision (do not commit blindly)

**Choose Expo Router when:**
- New Expo app.
- You want web + SEO + universal routing.
- You want automatic deep linking.
- The team has a Next.js / file-based mental model.
- Fast MVP.

This is the default recommendation. (Source matches the Command Brief's IDEAS / SUGGESTIONS exactly: lead with Expo Router, document the alternative.)

**Choose React Navigation directly when:**
- Primarily-mobile app with complex or highly custom navigators.
- You need maximum manual control over the navigation tree.
- A non-Expo bare RN app.

## Minimal Expo Router wiring

The file structure is the navigation:

```
app/
  _layout.tsx        // root layout (providers, stack)
  index.tsx          // "/" route
  (tabs)/
    _layout.tsx      // tab navigator
    home.tsx         // "/home"
    profile.tsx      // "/profile"
  settings.tsx       // "/settings"
```

- `_layout.tsx` files define navigators (stack, tabs, drawer) and wrap their directory's routes.
- Parentheses like `(tabs)` create a route group that does not add a path segment.
- Deep linking is automatic: the `scheme` from app config (`guides/03-app-config-permissions.md`) plus the file path resolves links into the app.

Confirm the exact v7 component imports (`Stack`, `Tabs`, `Slot`, `Link`, `useRouter`, `useLocalSearchParams`) against the Expo Router v7 docs when writing a concrete deliverable; the API surface is stable across v7 but verify the import path for the SDK in use.

## Audit checklist for navigation

- [ ] Navigation choice is documented with a reason (not defaulted silently).
- [ ] If Expo Router: `app/` directory present, root `_layout.tsx` present, `scheme` set in app config for deep links.
- [ ] If React Navigation: a documented reason for not using the Expo default.
- [ ] Expo Router version matches the SDK (v7 for SDK 55+).
