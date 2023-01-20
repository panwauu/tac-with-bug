[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)

[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=panwauu_tac-with-bug&metric=coverage)](https://sonarcloud.io/summary/new_code?id=panwauu_tac-with-bug)

[![TWB Logo](client/src/assets/TwbLogo.png)](https://www.tac-with-bug.com/)

[Tac-With-Bug](https://www.tac-with-bug.com/) is a online Multiplayer for the boardgame [TAC](https://shop.spiel-tac.de/Home). The game is a Vue webapp with a Node backend. Contributions are welcome.

# Getting Started Guide

Two step guide to get started with the [Tac-With-Bug](https://www.tac-with-bug.com/) development.

## Database Setup

You will need the CLI for Postgres `psql`. I also recommend [pgAdmin](https://www.pgadmin.org/) to manipulate the database using a GUI.

- On Windows install [postgres (13.x)](https://www.postgresql.org/download/) locally.

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
| [client](./client) | Vue source code for the web interface |
| [server](./server) | Node server code                      |

First all packages have to be installed and built.

```shell
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
