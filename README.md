[![TWB Logo](client/src/assets/TwbLogo.png)](https://tac-with-bug.herokuapp.com/)

[Tac-With-Bug](https://tac-with-bug.herokuapp.com/) is a online Multiplayer for the boardgame [TAC](https://shop.spiel-tac.de/Home). The game is a Vue webapp with a Node backend. Contributions are welcome.

# Getting Started Guide

Two step guide to get started with the [Tac-With-Bug](https://tac-with-bug.herokuapp.com/) development.

## Database Setup

You will need the CLI for Postgres `psql`. I also recommend pgAdmin to manipulate the database using a GUI.

- On Windows install [postgres (13.x)](https://www.postgresql.org/download/) locally.

- On Mac the easiest way is [Postgres.app](https://postgresapp.com).

- On Ubuntu you can install the psql CLI only (without the postgres server). Sadly the version is only postgres 12 but it did not lead to problems up to now.

  ```
  sudo apt install postgresql-client
  ```

Start the database with:

```
docker compose up -d
```

You can access the database inside the Docker container with:

```
docker exec -it postgres psql
```

You can populate the database from a .dump file located in the root folder using:

```
./dbDump.sh

Flags:
    -f: filename of the dump (default: tac.dump)
    -u: TWB username (default: Oskar)
        Password of this user will be applied to all users so that you can login into all of them
```

## Package Setup

[Tac-With-Bug](https://tac-with-bug.herokuapp.com/) is divided into three main parts:

| Folder             | Description                           |
| ------------------ | ------------------------------------- |
| [client](./client) | Vue source code for the web interface |
| [server](./server) | Node server code                      |
| [shared](./shared) | Shared interfaces and data            |

First all packages have to be installed and built.

```shell
cd shared
npm install

cd client
npm install

cd server
npm install
npm run building
npm run tsc
```

Afterwards you can start the server and client.

```shell
cd server
npm run devStart
```

```shell
cd client
npm run dev
```
