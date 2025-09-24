#!/bin/sh

# This script populates the database from a .dump file
# Flags:
#    -f: filename of the dump (default: tac.dump)
#    -u: TWB username (default: Oskar)
#        Password of this user will be applied to all users so that you can login into all of them

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

psql -h localhost -U postgres -d tac -c "UPDATE users SET password = (SELECT password FROM users WHERE username = '${username}');"
psql -h localhost -U postgres -d tac -c "UPDATE users SET profilepic = (SELECT profilepic FROM users WHERE username = '${username}');"
psql -h localhost -U postgres -d tac -c "UPDATE users SET email= id || 'test@test.test' WHERE username != '${username}';"
psql -h localhost -U postgres -d tac -c 'DELETE FROM waitinggames;'

psql -h localhost -U postgres -d tac -f './changes.sql'