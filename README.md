![TWB Logo](./client/src/assets/TwbLogo.png)

# Getting started

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

The project is divided into three main parts:

| Folder              | Description |
| ------------------- | ----------- |
| [client](client)    | This folder contains the Vue source code for the project |
| [server](server)    | This folder contains source code related to the server and is also the heroku root |
| [shared](shared)    | This folder contains shared interfaces and data across server and client |

To build server and client you need to install all npm packages and build the server typescript code:

```shell
cd shared
npm install

cd server
npm install
npm run building
npm run tsc

cd client
npm run install
```

Afterwards you can start server and client:

```bash
cd server
npm run devStart
```

```bash
cd client
npm run dev
```
