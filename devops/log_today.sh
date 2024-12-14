#!/bin/bash
# journalctl -u API-Server.service --since "`date -Idate` 03:00:00"
# journalctl -u API-Server.service --since "2022-00-00 03:00:00" --until "2022-00-00 03:00:00"
echo journalctl -u API-Server.service --since \""`date -Idate` 03:00:00"\" --until \""`date -Idate` 23:00:00"\"
