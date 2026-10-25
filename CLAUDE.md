# Tac-With-Bug

Vue client + Node server monorepo (npm workspaces + turbo) for the online
multiplayer of the board game TAC. Setup instructions: [README.md](./README.md).

## Commits and versioning — read before committing

Commit subjects are machine-read: they drive the automatic version bump on
`main` (`feat:`/`minor:` → minor, `major:`/`BREAKING CHANGE:` → major,
everything else → patch). Never edit the root `package.json` version and never
create `v*` tags manually.

Full rules: [docs/commits-and-versioning.md](./docs/commits-and-versioning.md).

## Checks

```shell
npm run lint
npm run check-format
npm run check-types
npm run check-locale-files
npm run test
```
