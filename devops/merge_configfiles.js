const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Caminhos dos arquivos
const configExamplePath = path.join(__dirname, 'configfile_example.ts');
const configYamlPath = path.join(__dirname, 'configfile.yaml');

// Função para extrair campos do configfile_example.ts
function parseConfigExample(fileContent) {
  const configMatch = fileContent.match(/const configfile: ConfigFile = ({[\s\S]*?});/);
  if (!configMatch) throw new Error('Erro ao extrair configfile do exemplo.');
  
  const configString = configMatch[1];
  return eval(`(${configString})`); // Converte para objeto JavaScript
}

// Função principal
async function updateConfigYaml() {
  try {
    // Ler conteúdo dos arquivos
    const configExampleContent = fs.readFileSync(configExamplePath, 'utf-8');
    const configYamlContent = fs.readFileSync(configYamlPath, 'utf-8');
    
    // Parse YAML existente
    const configYaml = yaml.load(configYamlContent);
    
    // Extrair configfile.js do ConfigMap
    const currentConfig = eval(configYaml.data['configfile.js'].replace(/exports\.default\s*=\s*/, ''));
    
    // Extrair campos do exemplo
    const exampleConfig = parseConfigExample(configExampleContent);
    
    // Mesclar campos (mantendo valores atuais se existirem)
    const updatedConfig = { ...exampleConfig, ...currentConfig };
    
    // Gerar novo configfile.js
    const updatedConfigJs = `
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      const configfile = ${JSON.stringify(updatedConfig, null, 2)};
      exports.default = configfile;
    `.trim();
    
    // Atualizar o YAML
    configYaml.data['configfile.js'] = updatedConfigJs;
    
    // Salvar o arquivo YAML atualizado
    fs.writeFileSync(configYamlPath, yaml.dump(configYaml), 'utf-8');
    console.log('ConfigMap atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar o ConfigMap:', error);
  }
}

// Executar função
updateConfigYaml();
