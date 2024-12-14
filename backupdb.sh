#/bin/bash
source awscredentials.sh
mkdir -p dbbackups && \
# date '+%FT%T%z'
mysqldump --user=udump -p$DUMPPW --single-transaction --ignore-table=dashprod.cache_cond_tel dashprod | gzip > /home/ubuntu/API-Server/dbbackups/db_backup_`date '+%u'`.gz && \
aws s3 sync /home/ubuntu/API-Server/dbbackups "s3://diel-backend-docs/API server/DatabaseBackups"
# mysql> source /path/to/db_backup.sql;
