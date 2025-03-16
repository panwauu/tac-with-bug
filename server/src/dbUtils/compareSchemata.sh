#!/bin/sh

### Colors for shell
GREEN='\e[0;32m'
RED='\e[0;31m'
NC='\e[0m'

### Get the server schema
postgresConnectionString=$(heroku config:get DATABASE_URL -a tac-with-bug)
postgresUser="$(echo $postgresConnectionString | sed -E 's+postgres://++g' | sed -E 's+:.*++g')"
[ -z "$postgresUser" ] && echo "${RED}Could not determine postgres User. Mostly likely no connection to heroku was established${NC}" && exit 1

heroku run -a tac-with-bug "pg_dump -s $postgresConnectionString" | sed -E "s/$postgresUser/postgres/g" > server_schema.sql
[ ! -s server_schema.sql ] && echo "${RED}Could not download server schema${NC}" && exit 1

### Populate test and server database with the schema
set -e
export PGPASSWORD=postgres

psql -h localhost -U postgres -d postgres -c 'DROP DATABASE IF EXISTS tac_server_schema;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac_server_schema;'
psql -h localhost -U postgres -d postgres -c 'DROP DATABASE IF EXISTS tac_test_schema;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac_test_schema;'

psql -h localhost -U postgres -d tac_server_schema -f './server_schema.sql'
psql -h localhost -U postgres -d tac_server_schema -f './changes.sql'
psql -h localhost -U postgres -d tac_test_schema -f './init_db_tac.sql'

### Perform diff
pgDiffResult=$(pg-diff -f 'pg-diff.config.json' -p '.' -c 'development' compare_script)

echo "$pgDiffResult" | grep -q "SQL patch file has been created" && { 
   fileName="$(echo "$pgDiffResult" | grep "SQL patch file has been created" | sed -E 's+.* ++g')"
   cat $fileName;
   rm $fileName;
   echo "";
   echo "${RED}There are differences between the server schema and the current test database schema. See above to read the sql commands.${NC}"; 
   exit 1; 
}

echo "${GREEN}Server and test database schemata are the same.${NC}"; 
exit 0;