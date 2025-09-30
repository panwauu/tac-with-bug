#!/bin/sh

# This script populates the database from a .dump file
# Flags:
#    -f: filename of the dump (default: tac.dump)
#    -u: TWB username (default: Oskar)
#        Password of this user will be applied to all users so that you can login into all of them
#    -d: database url (default: postgres://postgres:postgres@localhost:5433)
#    -t: database name (default: tac)

username='Oskar'
filename='tac.dump'
databaseurl='postgres://postgres:postgres@localhost:5433'
tac_database='tac'

while getopts u:f: flag
do
    case "${flag}" in
        u) username=${OPTARG};;
        f) filename=${OPTARG};;
        d) databaseurl=${OPTARG};;
        t) tac_database=${OPTARG};;
    esac
done

databaseurl_tac="${databaseurl}/${tac_database}"
databaseurl_postgres="${databaseurl}/postgres"

set -e
export PGPASSWORD=postgres

psql "$databaseurl_postgres" -c 'DROP DATABASE tac;'
psql "$databaseurl_postgres" -c 'CREATE DATABASE tac;'
pg_restore -d "$databaseurl_tac" --verbose --clean --no-acl --no-owner -j 8 "${filename}"

psql "$databaseurl_tac" -c 'UPDATE users SET currentsubscription=Null;'
psql "$databaseurl_tac" -c "UPDATE users SET password = (SELECT password FROM users WHERE username = '${username}');"
psql "$databaseurl_tac" -c "UPDATE users SET profilepic = (SELECT profilepic FROM users WHERE username = '${username}');"
psql "$databaseurl_tac" -c "UPDATE users SET email= id || 'test@test.test' WHERE username != '${username}';"
psql "$databaseurl_tac" -c 'DELETE FROM subscriptions;'
psql "$databaseurl_tac" -c 'DELETE FROM waitinggames;'

psql "$databaseurl_tac" -f './changes.sql'