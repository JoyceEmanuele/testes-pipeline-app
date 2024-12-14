## Procedimento para iniciar uma instância

`git clone https://github.com/dielenergia/API-Server`

`npm install`

Criar um banco de dados em um servidor MySQL criar a estrutura de acordo com o script `database/dbstruct.sql`. Atenção, as tabelas neste arquivo estão em ordem alfabética, então não dá para criar elas na ordem que aparecem por causa das dependências.

Criar um usuário no banco de dados para o backend e incluir na configuração em `configfile.ts`.

```plaintext
sudo mariadb
> CREATE DATABASE dashdevelopment;
> CREATE USER 'develbackend'@'localhost' IDENTIFIED BY 'uniquepassword';
> GRANT ALL PRIVILEGES ON dashdevelopment.* TO 'develbackend'@'localhost';
> FLUSH PRIVILEGES;
```

Para copiar os dados do banco de dados de produção pode usar esses comandos:
```plaintext
ssh -i ./dash-server.pem ubuntu@api.dielenergia.com "sudo mysqldump --no-data devdash | gzip" | gzip -d > prodbkp.sql
ssh -i ./dash-server.pem ubuntu@api.dielenergia.com "sudo mysqldump --no-create-info --ignore-table=devdash.cache_cond_tel --ignore-table=devdash.cache_gameter_cons --ignore-table=devdash.ECOCMDHIST --ignore-table=devdash.FAULTS_HIST --ignore-table=devdash.FR_REPORTS --ignore-table=devdash.ASSETS_HEALTH_HIST --ignore-table=devdash.IR_CODES --ignore-table=devdash.DUTS_IR_CODES --ignore-table=devdash.log_debug_faults devdash | gzip" | gzip -d >> prodbkp.sql
```

E para restaurar esses dados no banco de dados local:
```plaintext
echo "create database IF NOT EXISTS mydevdatabase; use mydevdatabase; source prodbkp.sql;" | sudo mariadb
```

Configurar no `configfile.ts` os certificados TLS ou ativar a opção para não usar TLS. Um certificado pode ser criado com o comando:
```plaintext
openssl req -newkey rsa:4096 -x509 -sha256 -days 8000 -nodes -out fake_server_certificate.pem -keyout fake_server_private_key.pem
```

Configurar as diversas credenciais necessárias no arquivo `configfile.ts`.

Para o serviço de envio de notificações por Telegram é necessário colocar o arquivo `libtdjson.so` na raiz do projeto. https://github.com/tdlib/td

O API-server usa 2 serviços que estão no repositório: https://github.com/dielenergia/dash-performance-server
O `rusthist` serve para buscar telemetrias do DynamoDB e compilar os dados para serem exibidos em gráficos. O `iotrelay` se conecta ao(s) broker(s) e faz a ponte com o API-server.

`npm run start`

## Informações
As credenciais do usuário master são definidas no arquivo `configfile.ts > frontUser`.
