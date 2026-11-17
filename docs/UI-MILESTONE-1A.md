# Nomadly UI Milestone 1A — Discovery Experience

## Included
- Refined homepage content hierarchy and travel discovery entry points.
- Interactive destination search and category filters on Explore.
- Destination detail route at `/destinations/[slug]`.
- Contextual booking categories with honest "Coming soon" labels.
- Responsive styling for the new discovery and detail surfaces.
- Not-found page for unknown destination slugs.

## Scope boundaries
This milestone is a UI and navigation foundation using the existing six seeded demo destinations. It does not implement authentication, persisted bookmarks, live inventory, external booking links, prices, availability, map search or full destination editorial content.

## Apply
Extract this patch ZIP into the existing `Nomadly` project folder and allow files to merge/overwrite. It intentionally does not include `.env`, `.env.local`, database volumes, migrations or `node_modules`.

## Verify
1. Keep PostgreSQL running.
2. Run `pnpm dev` from the project root.
3. Open `http://localhost:3000`.
4. Visit Explore and test search/category filters.
5. Open each destination card and verify its detail page.
6. Try `/destinations/not-a-real-place` and confirm the not-found page.
