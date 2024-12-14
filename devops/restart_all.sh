#!/bin/bash
bash ~/API-Server/devops/restart_api-async.sh
bash ~/API-Server/devops/restart_auth.sh
#bash ~/API-Server/devops/restart_gateway.sh
bash ~/API-Server/devops/restart_health.sh
bash ~/API-Server/devops/restart_realtime.sh
bash ~/API-Server/devops/restart_driautom.sh
bash ~/API-Server/devops/restart_ecodam.sh
bash ~/API-Server/devops/restart_bgtasks.sh
#bash ~/API-Server/devops/restart_invoice.sh
#bash ~/API-Server/devops/restart_swdocs.sh
