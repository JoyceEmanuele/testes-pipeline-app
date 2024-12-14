#!/bin/bash

if [ -e /etc/systemd/system/dap-service-api-async.service ]; then
  systemctl status dap-service-api-async.service -n 300
fi

if [ -e /etc/systemd/system/dap-service-api-async-1.service ]; then
  systemctl status dap-service-api-async-1.service -n 300
fi

if [ -e /etc/systemd/system/dap-service-api-async-2.service ]; then
  systemctl status dap-service-api-async-2.service -n 100
fi

if [ -e /etc/systemd/system/dap-service-api-async-3.service ]; then
  systemctl status dap-service-api-async-3.service -n 100
fi

if [ -e /etc/systemd/system/dap-service-api-async-4.service ]; then
  systemctl status dap-service-api-async-4.service -n 100
fi

if [ -e /etc/systemd/system/dap-service-api-async-5.service ]; then
  systemctl status dap-service-api-async-5.service -n 100
fi

if [ -e /etc/systemd/system/dap-service-api-async-6.service ]; then
  systemctl status dap-service-api-async-6.service -n 100
fi

if [ -e /etc/systemd/system/dap-service-api-async-7.service ]; then
  systemctl status dap-service-api-async-7.service -n 100
fi
