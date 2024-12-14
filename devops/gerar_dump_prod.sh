#!/bin/bash


## O desenvolvedor pode a partir da sua máquina local pegar um dump do servidor com os seguintes comandos: ##
#     export DIEL_USER_CERT="~/nome.sobrenome@diel.priv"
#     export DIEL_USERNAME="nome.sobrenome"
#     ssh -i $DIEL_USER_CERT $DIEL_USERNAME@api.dielenergia.com "source /home/diel/credenciais_db_dump.sh && source /home/diel/API-Server/devops/gerar_dump_prod.sh | gzip" | gzip -d > prodbkp.sql


## É necessário definir as configurações a seguir. Nos servidores Diel elas são definidas no arquivo "credenciais_db_dump.sh".
#     export DIEL_DBDUMP_USER="--user=udump"
#     export DIEL_DBDUMP_PASSWORD="--password=12345"
#     export DIEL_DBDUMP_HOST="--host=127.0.0.1"


mysqldump \
  $DIEL_DBDUMP_USER \
  $DIEL_DBDUMP_PASSWORD \
  $DIEL_DBDUMP_HOST \
  --no-data \
  --triggers \
  dashprod \
  | sed 's/utf8mb4_0900_ai_ci/utf8mb4_general_ci/g' \
  | sed -e 's/DEFINER[ ]*=[ ]*[^*]*\*/\*/' \
  || exit 1

mysqldump \
  $DIEL_DBDUMP_USER \
  $DIEL_DBDUMP_PASSWORD \
  $DIEL_DBDUMP_HOST \
  --single-transaction \
  --set-gtid-purged=OFF \
  --no-create-info \
  --skip-triggers \
  --complete-insert \
  --ignore-table=dashprod.cache_cond_tel \
  --ignore-table=dashprod.cache_gameter_cons \
  --ignore-table=dashprod.ECOCMDHIST \
  --ignore-table=dashprod.FAULTS_HIST \
  --ignore-table=dashprod.IRCODES_DUT \
  --ignore-table=dashprod.DASHUSERS \
  --ignore-table=dashprod.NOTIFDESTS \
  --ignore-table=dashprod.NOTIFSCFG \
  --ignore-table=dashprod.PWRECOVERTK \
  --ignore-table=dashprod.UNITSUPERVISORS \
  --ignore-table=dashprod.USERSCLIENTS \
  --ignore-table=dashprod.USERSTOKENS \
  --ignore-table=dashprod.VISITATECNICA \
  --ignore-table=dashprod.VTDRTS \
  --ignore-table=dashprod.VTENERGIES \
  --ignore-table=dashprod.VTENVIRONMENTS \
  --ignore-table=dashprod.VTMACHINES \
  --ignore-table=dashprod.VTWATERMEASURERS \
  --ignore-table=dashprod.VTWATERMEASURERIMAGES \
  --ignore-table=dashprod.VTMACHINEENVS \
  --ignore-table=dashprod.VTMACHINEENVSLOCATION \
  --ignore-table=dashprod.VTMACHINEIMAGES \
  --ignore-table=dashprod.VTMACHINEMACHINES \
  dashprod \
  | sed 's/[[:alnum:]\.\-_]\+@[[:alnum:]\.\-_]\+/fake@diel.diel/g' \
  || exit 1
