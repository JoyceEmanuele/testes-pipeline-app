#!/bin/bash


## O desenvolvedor pode a partir da sua máquina local pegar um dump do servidor com os seguintes comandos: ##
#     export DIEL_USER_CERT="~/nome.sobrenome@diel.priv"
#     export DIEL_USERNAME="nome.sobrenome"
#     ssh -i $DIEL_USER_CERT $DIEL_USERNAME@api-qa.dielenergia.com "source /home/diel/credenciais_db_dump.sh && source /home/diel/API-Server/devops/gerar_dump_qa.sh | gzip" | gzip -d > qabkp.sql


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
  dashdevelopment \
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
  --ignore-table=dashdevelopment.cache_cond_tel \
  --ignore-table=dashdevelopment.cache_gameter_cons \
  --ignore-table=dashdevelopment.ECOCMDHIST \
  --ignore-table=dashdevelopment.FAULTS_HIST \
  --ignore-table=dashdevelopment.IRCODES_DUT \
  --ignore-table=dashdevelopment.DASHUSERS \
  --ignore-table=dashdevelopment.NOTIFDESTS \
  --ignore-table=dashdevelopment.NOTIFSCFG \
  --ignore-table=dashdevelopment.PWRECOVERTK \
  --ignore-table=dashdevelopment.UNITSUPERVISORS \
  --ignore-table=dashdevelopment.USERSCLIENTS \
  --ignore-table=dashdevelopment.USERSTOKENS \
  --ignore-table=dashdevelopment.VISITATECNICA \
  --ignore-table=dashdevelopment.VTDRTS \
  --ignore-table=dashdevelopment.VTENERGIES \
  --ignore-table=dashdevelopment.VTENVIRONMENTS \
  --ignore-table=dashdevelopment.VTMACHINES \
  --ignore-table=dashdevelopment.VTWATERMEASURERS \
  --ignore-table=dashdevelopment.VTWATERMEASURERIMAGES \
  --ignore-table=dashdevelopment.VTMACHINEENVS \
  --ignore-table=dashdevelopment.VTMACHINEENVSLOCATION \
  --ignore-table=dashdevelopment.VTMACHINEIMAGES \
  --ignore-table=dashdevelopment.VTMACHINEMACHINES \
  dashdevelopment \
  | sed 's/[[:alnum:]\.\-_]\+@[[:alnum:]\.\-_]\+/fake@diel.diel/g' \
  || exit 1
