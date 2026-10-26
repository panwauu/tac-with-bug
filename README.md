[![TWB Logo](apps/client/src/assets/TwbLogo.png)](https://www.tac-with-bug.com/)

[Tac-With-Bug](https://www.tac-with-bug.com/) is a online Multiplayer for the boardgame [TAC](https://shop.spiel-tac.de/Home). The game is a Vue webapp with a Node backend. Contributions are welcome.

# Getting Started Guide

Two step guide to get started with the [Tac-With-Bug](https://www.tac-with-bug.com/) development.

## Database Setup

You will need the CLI for Postgres `psql`. I also recommend [pgAdmin](https://www.pgadmin.org/) to manipulate the database using a GUI.

- On Windows install [postgres (17.x)](https://www.postgresql.org/download/) locally.

- On Mac the easiest way is [Postgres.app](https://postgresapp.com).

- On Ubuntu you can install the psql CLI only (without the postgres server).

  ```
  sudo apt install postgresql-client
  ```

Start the database with:

```
docker compose up -d
```

You can access the database either inside the Docker container or from your system. The postgres password is `PGPASSWORD=postgres`.

```
docker exec -it postgres psql
psql -h localhost -U postgres -d tac -c 'INSERT YOUR SQL CODE;'
```

The database is initialized but not populated. To populate it you can use the test data:

```
psql -h localhost -U postgres -d tac -f './server/src/dbUtils/populate_test.sql'
```

## Package Setup

[Tac-With-Bug](https://www.tac-with-bug.com/) is divided into the following parts:

| Folder             | Description                           |
| ------------------ | ------------------------------------- |
| [core](./core)     | Core logics for game and bots         |
| [client](./client) | Vue source code for the web interface |
| [server](./server) | Node server code                      |

First all packages have to be installed and built.

```shell
cd core
npm install

cd client
npm install

cd server
npm install
npm run build-spec
npm run tsc
```

Afterwards you can start the server and client.

```shell
cd server
npm run start:dev
```

```shell
cd client
npm run dev
```

## AI service for the online bots

The AI levels of the TAC app (bot numbers from 10, see `packages/core/src/bot/netz/onlineStufen.ts`) are computed outside the game loop, so a busy AI can never slow down the game itself:

- Without configuration the game server computes them in worker threads of its own process (`KI_THREADS`, default 1).
- With `KI_URL` set, a separate AI service computes them (`apps/server/src/entrypoints/kiDienst.ts`). It can run as its own process, container or machine. Start it with `node apps/server/dist/entrypoints/kiDienst.js`, with `docker compose --profile ki up -d`, or as a second Heroku app with the same code and `KI_DIENST=1`. Shared secret `KI_GEHEIMNIS` on both sides (required in production).

Every AI move has a deadline of 6 s. Under load the search time per move gets shorter (bots play a bit weaker, not slower); if a move does not arrive in time, Futuro plays instead, so a game never stalls. `GET /zustand` on the AI service shows threads, queue and average waiting and computing time.

# Contributing

Commit messages are not free-form: the subject line of a commit decides how the
version number is bumped when it reaches `main`. Before you commit, read
[Commits, Branches and Versioning](./docs/commits-and-versioning.md).

# Moderation

Players report other players on their profile page. Moderators and admins handle the reports on the page `/moderation` (in the menu once you are a moderator): block for some days, reset picture and profile text, unblock or close the reports. Admins name the moderators on the same page. If three different players report the same player within 24 hours, that player is blocked for 24 hours automatically until a moderator decides.

Blocks can also be managed directly:

Go to [the swagger documentation](https://tac-with-bug.herokuapp.com/gameapi/api-docs/). Then:

1. Find login endpoint and login
2. Copy the token and paste it in the "Authorize" field (top of page)
3. Use the endpoints tagged as DEV
