#!/bin/sh

set -e
export PGPASSWORD=postgres

psql -h localhost -U postgres -d postgres -c 'DROP DATABASE IF EXISTS tac_test;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac_test;'

psql -h localhost -U postgres -d tac_test -f './server/src/dbUtils/init_db_tac.sql'
psql -h localhost -U postgres -d tac_test -f './server/src/dbUtils/populate_test.sql'
tutorial_json=`cat ./server/src/dbUtils/intro.json`
psql -h localhost -U postgres -d tac_test -c "INSERT INTO tutorials (id, data) VALUES (0, '${tutorial_json}');"