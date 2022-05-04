# Local Development Setup

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

The dump is downloaded using the [heroku CLI](https://devcenter.heroku.com/categories/command-line). Oskar can provide you with the dump.

## Shared modules

There is a module called `shared` where mainly the shared types for socket.io between server and client are defined. Before you can use server or socket you need to install all the dependencies in the shared folder:

```
cd server
npm install
```

## Server-Side Setup

First install the server node modules:

```
cd server
npm install
```

To start the OpenAPI generator and ts-compiler use:

```
cd server
npm run buildWatch
```

```
cd server
npm run tscWatch
```

To start the server:

```
cd server
npm run devStart
```

## Client-Side Setup

```
cd client
npm install
```

To start the vue server

```
cd client
npm run dev
```

# Access Heroku Error Logs

```
heroku pg:psql cobalt
SET client_encoding TO 'UTF8';
SELECT * FROM logs ORDER BY timestamp DESC;
```
