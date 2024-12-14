## Procedimento para criar um certificado localhost

Criar um arquivo `openssl.cnf` como o exemplo abaixo:
```plaintext
[ ca ]
default_ca = mainca

[ mainca ]
dir = ./ca
certificate = $dir/ca_certificate.pem
database = $dir/index.txt
new_certs_dir = $dir/certs
unique_subject = no
private_key = $dir/ca_private_key.pem
serial = $dir/serial

default_crl_days = 7
default_days = 365
default_md = sha256

policy = mainca_policy
x509_extensions = certificate_extensions

[ mainca_policy ]
commonName = supplied
stateOrProvinceName = optional
countryName = optional
emailAddress = optional
organizationName = optional
organizationalUnitName = optional
domainComponent = optional

[ certificate_extensions ]
basicConstraints = CA:false

[ req ]
default_bits = 2048
default_keyfile = ./ca/ca_private_key.pem
default_md = sha256
prompt = yes
distinguished_name = main_root_ca
x509_extensions = root_ca_extensions

[ main_root_ca ]
commonName = hostname

[ root_ca_extensions ]
basicConstraints = CA:true
keyUsage = keyCertSign, cRLSign

[ cert_extensions ]
basicConstraints = CA:false
keyUsage = digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth, clientAuth

[ server_ca_extensions ]
basicConstraints = CA:false
keyUsage = digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth, clientAuth

# serverAuth      (1.3.6.1.5.5.7.3.1) -- TLS Web server authentication
# clientAuth      (1.3.6.1.5.5.7.3.2) -- TLS Web client authentication
# codeSigning     (1.3.6.1.5.5.7.3.3) -- Code signing
# emailProtection (1.3.6.1.5.5.7.3.4) -- E-mail protection
# timeStamping    (1.3.6.1.5.5.7.3.8) -- Timestamping
# ocspSigning     (1.3.6.1.5.5.7.3.9) -- OCSPstamping
```

Preparar a pasta para a geração de certificados

```plaintext
mkdir -p ca/certs
echo 01 > ca/serial
touch ca/index.txt
```

Gerar um certificado raiz:

```plaintext
openssl req -x509 -config openssl.cnf -newkey rsa:2048 -days 800 -out ca/ca_certificate.pem -outform PEM -subj /CN=localhost/ -nodes
openssl x509 -in ca/ca_certificate.pem -out ca/ca_certificate.cer -outform DER
chmod 700 ca/ca_private_key.pem
```

No Arch Linux estes comandos registram o certificado raiz para que os certificados assinados por ele sejam reconhecidos pelo sistema:

```plaintext
cp -i ca/ca_certificate.pem /etc/ca-certificates/trust-source/anchors/localhost.crt
trust extract-compat
```

Gerar um novo certificado de aplicação assinado pelo certificado raiz:

```plaintext
CERT_NAME=myApplication
mkdir -p $CERT_NAME
openssl genrsa -out $CERT_NAME/`echo $CERT_NAME`_private_key.pem 2048
openssl req -new -key $CERT_NAME/`echo $CERT_NAME`_private_key.pem -out $CERT_NAME/req.pem -outform PEM -subj /CN=localhost/O=$CERT_NAME/ -nodes
openssl ca -config openssl.cnf -in $CERT_NAME/req.pem -out $CERT_NAME/`echo $CERT_NAME`_public_cert.pem -notext -batch -extensions cert_extensions
cp -i ca/ca_certificate.pem $CERT_NAME/
```
