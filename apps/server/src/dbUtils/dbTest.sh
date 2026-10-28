#!/bin/sh

set -e
export PGPASSWORD=postgres

psql -h localhost -U postgres -d postgres -c 'DROP DATABASE IF EXISTS tac_test;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac_test;'

psql -h localhost -U postgres -d tac_test -f './init_db_tac.sql'
psql -h localhost -U postgres -d tac_test -f './populate_test.sql'
