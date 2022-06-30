#!/bin/sh

set -e
export PGPASSWORD=postgres

psql -h localhost -U postgres -d postgres -c 'DROP DATABASE tac;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac;'

psql -h localhost -U postgres -d tac -f './server/src/dbUtils/init_db_tac.sql'
psql -h localhost -U postgres -d tac -f './server/src/dbUtils/populate_test.sql'
tutorial_json=`cat ./server/src/dbUtils/intro.json`
psql -h localhost -U postgres -d tac -c "INSERT INTO tutorials (id, data) VALUES (0, '${tutorial_json}');"