O API-Server usa o `certbot` para criar certificados TLS pelo Let's Encrypt para o domínio api.dielenergia.com.
O `certbot` precisa usar a porta 80 para renovar o certificado, então ela tem que estar livre.

// sudo certbot certonly --standalone --http-01-port 8080

const portListen = 80;
const portDest = 8080;

