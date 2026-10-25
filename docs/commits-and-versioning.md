# Commits, Branches and Versioning

This document describes how commits must be written in this repository, what
happens to them after they are pushed, and how the version number of
Tac-With-Bug is created. It is written for human contributors **and** for AI
agents working in this repo — both must follow the same rules.

## TL;DR for agents

- Write commit subjects in English, imperative, one line, no trailing period.
- **The commit subject controls the version bump.** Start the subject with
  `feat:` or `minor:` for a minor bump, with `major:` / `BREAKING CHANGE:` for
  a major bump, anything else gives a patch bump.
- Never edit the `version` field in the root [package.json](../package.json)
  and never create `v*` tags by hand — CI does that.
- Never commit directly to `main`; work on a feature branch and open a PR.

## Branch model

| Branch                  | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `main`                  | Release branch. Every push triggers a version bump and a `v*` tag.    |
| `development`           | Integration branch for ongoing work.                                  |
| `<topic>` / `dev-<name>`| Feature or fix branches, merged via pull request.                     |

Flow: `topic branch` → PR → `development` → PR → `main` → (manual) deploy.

Pull requests run [build.yml](../.github/workflows/build.yml) (lint, format,
build, locale file check, unit tests, Playwright e2e tests) and
[databaseConsistency.yml](../.github/workflows/databaseConsistency.yml)
(compares the local schema against the production schema). All of them must
be green before merging.

## How to write a commit message

```
<type/keyword>: <short summary in the imperative>

<optional body: why the change is needed, not what the diff shows>
```

Rules:

1. **English**, imperative mood (`Add …`, `Fix …`, `Remove …`), not
   `Added`/`Adding`.
2. Subject line ≤ ~72 characters, no trailing period.
3. One logical change per commit. Formatting-only changes belong in their own
   commit (`Fix format`).
4. Reference issues with `#<number>` when a commit closes or relates to one
   (`Fix #240 with some code from #242`).
5. The keyword prefix is **not** cosmetic — see the next section. If you are
   unsure, use no keyword: that results in a patch bump, which is the safe
   default.
6. Do not write `CI: bumps version to …` yourself; that message is reserved
   for the bump bot.

Examples from this repository:

```
Close waiting rooms after 60 minutes without activity
UX: show login prompt in empty waiting room for logged-out users
Fix #212
minor: Execute sql and mark players as bots
feat: Isolate core for future offline usage (#202)
```

## How versioning works

The single source of truth is the `version` field of the **root**
[package.json](../package.json). The per-package `package.json` files in
`apps/*` and `packages/*` stay at `0.0.0` on purpose and are never bumped.

### The bump job

[bump.yml](../.github/workflows/bump.yml) runs on every push to `main` and
uses [`phips28/gh-action-bump-version`](https://github.com/phips28/gh-action-bump-version).
It inspects the commit messages that arrived with the push and decides:

| Commit subject contains / starts with | Bump  | `1.6.6` becomes |
| ------------------------------------- | ----- | --------------- |
| `major`, `BREAKING CHANGE`, `refactor!:` | major | `2.0.0`      |
| `feat`, `minor`                       | minor | `1.7.0`         |
| `pre-alpha`, `pre-beta`, `pre-rc`     | rc    | prerelease      |
| anything else (default)               | patch | `1.6.7`         |

The job then

1. writes the new version into the root `package.json`,
2. commits it as `CI: bumps version to {{version}}` (author
   `Automated Version Bump`), and
3. creates and pushes the tag `v<version>`, e.g. `v1.6.6`.

Because the default bump policy is `all`, a push that already contains a bump
commit is skipped — the bot never bumps its own commit.

> Note on merge commits: when a branch is merged into `main`, all contained
> commit subjects are considered. A single `feat:`/`minor:` commit anywhere in
> the merged range is enough to produce a minor bump, so use those keywords
> deliberately.

### Where the version shows up

- Server: [`getRootPackageVersion()`](../apps/server/src/entrypoints/version.ts)
  reads the root `package.json` at runtime.
- Client: [vite.config.ts](../apps/client/vite.config.ts) injects the same
  value as `import.meta.env.PACKAGE_VERSION` at build time.
- [`useCheckVersions.ts`](../apps/client/src/services/useCheckVersions.ts)
  compares both and warns the user when a stale client talks to a newer
  server. This is why client and server must always be built from the same
  commit.

## Deployment

[deploy.yml](../.github/workflows/deploy.yml) is triggered **manually**
(`workflow_dispatch`). It pushes the checked-out tree to Heroku, moves the
floating tag `deployed` to the deployed commit and runs a sanity request
against the live site. So:

- `v*` tags = every released version on `main`.
- `deployed` tag = the commit currently running in production.

A version bump alone does **not** deploy anything.

## Checklist before committing

```shell
npm run lint
npm run check-format      # npm run prettier:format fixes
npm run check-types
npm run check-locale-files
npm run test
```
