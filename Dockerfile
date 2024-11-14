# Use uma imagem base leve
FROM python:3.9-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos da aplicação
COPY app.py /app

# Instala o Flask
RUN pip install flask

# Define a porta que o container expõe
EXPOSE 5000

# Comando para iniciar a aplicação
CMD ["python", "app.py"]
