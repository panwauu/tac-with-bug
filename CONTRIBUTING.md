# Contributing to Tac-With-Bug

Contributions are welcome, including AI-assisted ones. A large part of this
repository is now touched by coding agents, so this document is written mainly
for that case: it addresses **the person submitting AI-assisted work** and **the
agent doing the work** at the same time. Everything here applies to purely
manual contributions as well.

Setup instructions live in [README.md](./README.md). Commit, branch and
versioning rules live in
[docs/commits-and-versioning.md](./docs/commits-and-versioning.md). Agents start
at [CLAUDE.md](./CLAUDE.md).

## The deal

An agent can produce a diff much faster than a maintainer can review it. The
rules below exist to keep that from turning into unpaid review work.

1. **You are the author.** Whoever opens the pull request is accountable for the
   code, not the model. Be able to explain every line, and be ready to answer
   review questions without going back to the agent.
2. **Say that AI was involved.** One line in the PR description is enough
   (which tool, roughly how much of the diff). This is not a disqualifier — it
   tells the reviewer where to look harder.
3. **Run the checks locally.** CI is not the first place a failure should show
   up. See [Checks](#checks).
4. **No drive-by diffs.** A PR does one thing. Reformatting, renames,
   dependency bumps or "while I was here" cleanups belong in their own PR.
5. **Understand before changing.** Game rules, bot logic and database schema in
   this project carry implicit knowledge that is not in the code. If the agent
   cannot explain _why_ the existing code is the way it is, do not let it
   rewrite that code.

## Before you start

- Open or comment on an issue first for anything beyond a small fix. An
  unannounced large AI-generated PR is likely to be closed, however good it is.
- Agree on the approach before generating the implementation. Review time is
  the scarce resource here, not code.

## Repository layout

| Path                         | Content                                              |
| ---------------------------- | ---------------------------------------------------- |
| `apps/client`                | Vue 3 web client (PrimeVue, pinia, vue-i18n)         |
| `apps/server`                | Node server (tsoa REST + socket.io), Postgres access |
| `packages/core`              | Shared game logic and bots                           |
| `packages/eslint-config`     | Shared ESLint config                                 |
| `packages/typescript-config` | Shared tsconfig bases                                |

npm workspaces + turbo. Install once in the repository root (`npm install`), not
per package.

## Traps that agents reliably fall into

Read this section before letting an agent loose on the repo. Each of these has
caused broken pull requests.

- **`apps/client/src/generatedClient` is generated.** It comes from the server's
  OpenAPI spec via `npm run build-spec` in `apps/server`. Never hand-edit it;
  change the tsoa controller and regenerate.
- **Translations come in threes.** Every new i18n key must exist in `de.json`,
  `en.json` _and_ `ru.json` under `apps/client/src/locales`, and the
  server's mail templates in `apps/server/email/locales` follow the same rule. `npm run check-locale-files` fails otherwise — it is a CI job,
  not a lint nicety.
- **Never touch the root `version` field, never create `v*` tags.** CI owns
  them. The commit subject decides the bump, so prefixes like `feat:` / `minor:`
  are semantics, not decoration — see
  [docs/commits-and-versioning.md](./docs/commits-and-versioning.md).
- **Database changes are checked against production.**
  [databaseConsistency.yml](./.github/workflows/databaseConsistency.yml)
  compares the local schema with the live one. Schema changes need the
  corresponding SQL, not just a changed query.
- **Tests need a database.** Unit tests and Playwright e2e tests run against
  Postgres from [docker-compose.yml](./docker-compose.yml); the e2e suite needs
  `npm run setup-test-database` in `apps/server` and installed Playwright
  browsers.
- **Do not add dependencies casually.** A new package needs a reason in the PR
  description and a compatible license. Agents add libraries for problems the
  repo already solves — check `packages/core` and the existing services first.
- **Mind the blast radius.** Payment and subscription code
  (`apps/server/src/paypal`, the subscription views), authentication, and the
  game state machine in `packages/core` affect real money, real accounts and
  running games. Small, reviewable changes only.

## Checks

All of these must pass before you open a pull request. They mirror
[build.yml](./.github/workflows/build.yml).

```shell
npm run lint
npm run check-format      # npm run prettier:format fixes
npm run check-types
npm run build
npm run check-locale-files
npm run test
npm run test:e2e          # needs the test database and Playwright browsers
```

Agents: run these yourself and fix what they report. Do not report a task as
finished with failing or unrun checks — say explicitly what you did not run.

## Tests

- Unit tests with vitest, next to the code they cover.
- End-to-end tests with Playwright in `apps/server/src/test/e2e`.
- New behaviour gets a test. A bug fix gets a test that fails without the fix.
- Do not change a test so it matches new behaviour without saying so in the PR
  description — that is the one change a reviewer must never miss.

## Pull requests

Target `development`, not `main`. Keep the branch rebased.

The description should contain:

- what changes and **why** (the diff already shows the what),
- how you verified it, which checks you ran,
- the AI disclosure from [The deal](#the-deal),
- anything you are unsure about — flagged uncertainty is cheap, discovered
  uncertainty is not.

## Legal and conduct

- **Never commit secrets** (`.env` files, tokens, PayPal credentials) and never
  paste production data — user names, mail addresses, payment records — into
  issues, PRs, logs, test fixtures or an AI tool's context.
- **Report security issues privately** to <lorenz@spieltac.de> instead of
  opening a public issue.
- **Third-party material needs a license.** Images, fonts, sounds and copied
  code snippets must be attributable and compatible; name the source in the PR.
  This applies to AI-generated assets too.
- **TAC is a protected product** of [spiel-tac.de](https://shop.spiel-tac.de/Home);
  its name and artwork may only be used in the form agreed with the rights
  holder.
- Be civil in issues, pull requests and in the game itself. Harassment gets you
  removed from both.