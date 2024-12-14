#!/bin/bash

if [ -e /etc/systemd/system/dap-service-api-async.service ]; then
  sudo systemctl restart dap-service-api-async.service
fi

if [ -e /etc/systemd/system/dap-service-api-async-1.service ]; then
  sudo systemctl restart dap-service-api-async-1.service
  sudo systemctl restart dap-service-api-async-2.service
  sudo systemctl restart dap-service-api-async-3.service
  sudo systemctl restart dap-service-api-async-4.service
  sudo systemctl restart dap-service-api-async-5.service
  sudo systemctl restart dap-service-api-async-6.service
  sudo systemctl restart dap-service-api-async-7.service
fi
