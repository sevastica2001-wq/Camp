# Camp Transportation Planner

Desktop web app for organizing church camp transportation. Frontend-only, with all data kept in memory and persisted to LocalStorage.

## Run

```bash
npm install
npm start
```

Open http://localhost:4200

## Share data with others (published seed)

Other people cannot see your LocalStorage. To publish a shared snapshot:

1. Enter/edit your data in the app.
2. Open **Export → Download seed for publish**.
3. Replace this file with the downloaded file:
   `src/app/features/transport-planner/data/published-seed.json`
4. Commit, build, and deploy (e.g. GitHub Pages).

### What visitors get

- First visit (empty LocalStorage) → app loads the **published seed**.
- They can **view and edit locally**; changes stay in **their** browser only.
- Their edits do **not** sync back to GitHub or other users.
- **Export → Reset to published seed** restores the shared snapshot (undoable once).

### Update the shared snapshot later

Repeat steps 1–4, then redeploy. Visitors who already edited locally keep their own copy until they reset or clear site data.

## Publish to GitHub Pages

```bash
# Replace REPO_NAME with your GitHub repository name
npm run build -- --base-href=/REPO_NAME/
```

Then upload the contents of `dist/camp-transportation-planner/browser` to GitHub Pages (or use an Action).

## Stack

- Angular 21 (standalone, zoneless, signals)
- Angular Material + CDK Drag & Drop
- Tailwind CSS
- PapaParse (CSV import/export)
- Angular Animations

## Pages

| Route | Purpose |
|-------|---------|
| `/planner` | Planning board |
| `/overview` | Printable transportation overview |

## Architecture

Feature-based layout under `src/app/features/transport-planner/`.

Business logic lives in services; UI components stay presentational. State is held in `TransportStore` (Angular Signals).

### Swapping LocalStorage for a REST API later

Persistence is isolated behind `ITransportRepository` and the `TRANSPORT_REPOSITORY` token:

1. Implement `ApiTransportRepository` with the same `load` / `save` / `clear` contract.
2. Change the provider in `app.config.ts` from `LocalStorageTransportRepository` to your API implementation.
3. Leave `TransportStore`, assignment, validation, and auto-assign services unchanged.

## Features

- Add people via modal (drivers or passengers)
- Drag passengers between Unassigned and driver cards
- Driver cards in a 5-column grid
- Live summary bar, search, filters, problems panel
- CSV export + full JSON backup/seed for publishing
- Smart auto-assign by departure city
- Undo / Redo (`Ctrl+Z` / `Ctrl+Shift+Z`)
- Light / Dark / System theme

## Scripts

```bash
npm start      # dev server
npm run build  # production build
npm test       # unit tests
```
