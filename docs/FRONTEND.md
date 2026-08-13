# Guide frontend — conventions senior

## Structure

| Zone | Rôle |
|------|------|
| `src/app/[slug]/` | Pages école (routes FR métier) |
| `src/components/layout/` | AppShell, top bar, sidebar |
| `src/components/{domaine}/` | UI métier (eleves, paiements, …) |
| `messages/{fr,en}/` | Copy i18n — toute string visible passe par next-intl |

## Design system (`globals.css`)

- Tokens CSS `:root` / `[data-theme="dark"]` pour fond, cartes, inputs.
- Classes utilitaires : `.page-title`, `.card`, `.btn-primary`, `.input-field`.
- Marketing : préfixe `.mk-*` dans `marketing.css`.

## Patterns à suivre

1. **PageShell** pour titre + breadcrumb (via TopBarContext).
2. **ModuleGuard** + `hasModuleAccess` côté client ; `requireModule` côté API.
3. Composants layout avec `variant` plutôt que dupliquer (ex. `SyncStatusIndicator`, `LicenceButton`).
4. Pas de string UI en dur — clés `messages/*`.
5. Toasts via `react-hot-toast`, messages traduits.

## Améliorations prioritaires (backlog)

- [ ] Unifier `components/students/` → `components/eleves/` (nommage route)
- [ ] Extraire filtres `filter-presets.ts` vers i18n ou hooks par page
- [ ] `SmartFilterBar` : presets depuis messages, pas labels FR en dur
- [ ] Tests visuels Playwright sur parcours inscription → paiement
- [ ] `focus-visible` systématique sur composants interactifs custom
- [ ] Réduire props drilling SchoolProvider → contextes ciblés si pages lourdes

## Marketing

- Pas de faux témoignages — section `trustSignals` (faits produit).
- Hero : promesse concrète, pas de slogan générique.
