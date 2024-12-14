#!/bin/bash

DB_USER="root"

DATABASES=$(mysql -u $DB_USER -e "SHOW DATABASES;" | grep -Ev "(Database|information_schema|performance_schema)")

for DB in $DATABASES; do
    mysqldump -u $DB_USER --databases $DB > "$DB.sql"
    sed -i '1d' "$DB.sql"
done