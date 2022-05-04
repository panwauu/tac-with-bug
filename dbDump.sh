#!/bin/sh

username='Oskar'
filename='tac.dump'

while getopts u:f: flag
do
    case "${flag}" in
        u) username=${OPTARG};;
        f) filename=${OPTARG};;
    esac
done

set -e
export PGPASSWORD=postgres

psql -h localhost -U postgres -d postgres -c 'DROP DATABASE tac;'
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tac;'
pg_restore --verbose --clean --no-acl --no-owner -h localhost -U postgres -d tac -j 8 ${filename} || true

psql -h localhost -U postgres -d tac -c 'UPDATE users SET currentsubscription=Null;'
psql -h localhost -U postgres -d tac -c "UPDATE users SET password = (SELECT password FROM users WHERE username = '${username}');"
psql -h localhost -U postgres -d tac -c "UPDATE users SET profilepic = (SELECT profilepic FROM users WHERE username = '${username}');"
psql -h localhost -U postgres -d tac -c "UPDATE users SET email= id || 'test@test.test' WHERE username != '${username}';"
psql -h localhost -U postgres -d tac -c 'DELETE FROM subscriptions;'
psql -h localhost -U postgres -d tac -c 'DELETE FROM waitinggames;'

psql -h localhost -U postgres -d tac -f './server/src/dbUtils/changes.sql'