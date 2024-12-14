interface HealthIndexInfo {
  titulo: string
  // performance: string
  laudo: string
  cor: string
}
const healthIndexes: {[k:string]:HealthIndexInfo} = {
  '100': {
    titulo: 'Operação correta',
    // performance: 'Máquina Eficiente',
    laudo: 'Sistema operando corretamente',
    cor: '#58CC00',
  }, // VERDE
  '75':  {
    titulo: 'Fora de especificação',
    // performance: 'Máquina ineficiente - Pode estar consumindo mais',
    laudo: 'Sistema operando fora de especificação',
    cor: '#FDB400',
  }, // AMARELO
  '50':  {
    titulo: 'Risco iminente',
    // performance: 'Máquina ineficiente - Consumindo mais e com baixa refrigeração',
    laudo: 'Sistema com falha',
    cor: '#FF5C00',
  }, // LARANJA
  '25':  {
    titulo: 'Manutenção urgente',
    // performance: 'Máquina inoperante - Sem refrigeração',
    laudo: 'Sistema com falha grave',
    cor: '#DC0E01',
  }, // VERMELHO

  '4':   { titulo: 'Desativado',      laudo: 'Máquina desativada', cor: '#555555' }, // CINZA ESCURO     // performance: 'Sem informação'
  '3':   { titulo: 'Não monitorado',  laudo: 'Sem informação',     cor: '#ABB0B4' }, // CINZA            // performance: 'Sem informação'
  '2':   { titulo: 'Offline',         laudo: 'Sem informação',     cor: '#ABB0B4' }, // CINZA            // performance: 'Sem informação'
  '1':   { titulo: 'Recém instalado', laudo: 'Sem informação',     cor: '#ABB0B4' }, // CINZA            // performance: 'Sem informação'
  '0':   { titulo: 'Sem informação',  laudo: 'Sem informação',     cor: '#ABB0B4' }  // CINZA            // performance: 'Sem informação'
}
export { healthIndexes }

export const healthLevelDesc: { [level: string]: string } = {
  // '0': 'Sem informação',
  '2': 'Equipamento offline',
  '4': 'Máquina desativada',
  '25': 'Manutenção urgente',
  '50': 'Risco iminente',
  '75': 'Fora de especificação',
  '100': 'Operando corretamente'
}

export const hDescs = {
  equipamentoOffline: 'Equipamento offline',
  sistemaOperandoCorretamente: 'Sistema operando corretamente',
}

export const possibleCauses: {[k:string]:{text:string,levels?:string}} = {
   '1': { text: 'Baixa carga de fluido refrigerante',               levels: 'AL'  },
   '2': { text: 'Alta carga de fluido refrigerante',                levels: 'ALV' },
   '3': { text: 'Vazamento de fluido refrigerante',                 levels: 'V'   },
   '4': { text: 'Carga térmica excessiva – sistema sobrecarregado', levels: 'ALV' },
   '5': { text: 'Dispositivo de expansão desregulado',              levels: 'ALV' },
   '6': { text: 'Problema na evaporação',                           levels: ''    },
   '7': { text: 'Temperatura ambiente alta',                        levels: ''    },
   '8': { text: 'Problema na condensação',                          levels: ''    },
   '9': { text: 'Problema no compressor',                           levels: ''    },
  '10': { text: 'Temperatura alta no ambiente de condensação',      levels: 'ALV' },
  '11': { text: 'Restrição na linha de líquido',                    levels: 'ALV' },
  '12': { text: 'Deficiência no fluxo de ar da evaporadora',        levels: 'ALV' },
  '13': { text: 'Deficiência no fluxo de ar da condensadora',       levels: 'ALV' },
  '14': { text: 'Compressor ineficiente',                           levels: 'ALV' },
  '15': { text: 'Compressor inoperante',                            levels: 'ALV' },
  '16': { text: 'Falha elétrica',                                   levels: 'ALV' },
  '17': { text: 'Falha no pressostato de baixa',                    levels: 'AL'  },
  '18': { text: 'Alta temperatura ambiente' },
  '19': { text: 'Ambiente mal isolado(Ex. porta aberta)' },
  '20': { text: 'Baixa vazão de água' },
  '21': { text: 'Condensadora enclausurada' },
  '22': { text: 'Condensadoras muito próximas' },
  '23': { text: 'Correia quebrada' },
  '24': { text: 'Equipamento subdimensionado' },
  '25': { text: 'Equipamento superdimensionado' },
  '26': { text: 'Falha na bomba' },
  '27': { text: 'Falha na ventilação' },
  '28': { text: 'Falha no ventilador da evaporadora' },
  '29': { text: 'Alta vazão de água' },
  '30': { text: 'Possível falha no chiller' },
  '31': { text: 'Recarga de gás inadequada (pouco gás ou não condensáveis no sistema)' },
  '32': { text: 'Sistema retornou à normalidade' },
  '33': { text: 'Sistema sem ser utilizado por um período longo' },
  '34': { text: 'Sujeira excessiva na condensadora' },
  '35': { text: 'Sujeira excessiva' },
  '36': { text: 'Sujeira na evaporadora' },
  '37': { text: 'Temperatura do setpoint do termostato muito baixa' },
  '38': { text: 'Ventilador da condensadora com defeito' },
  '39': { text: 'Carga de fluido refrigerante inadequada' },
  '40': { text: 'Não condensáveis no sistema' },
  '41': { text: 'Bomba de água com defeito' },
  '42': { text: 'Sujeira na fancoil' },
  '43': { text: 'Falha no ventilador do fancoil' },
  '44': { text: 'Desinstalação da automação' },
  '45': { text: 'Setpoint alto no termostato' },
}

export const laudos: {
  text: string,
  pcauses?: string[],
  application: string[],
}[] = [
  { text: 'Máquina em manutenção', application: ['ar-condicionado', 'camara-fria', 'chiller', 'fancoil'] },
  { text: 'Sistema restabelecido', application: ['ar-condicionado', 'camara-fria', 'chiller', 'fancoil'] },
  { text: 'Baixo uso de máquina', pcauses: ['33'], application: ['ar-condicionado', 'camara-fria', 'chiller', 'fancoil'] },
  { text: 'Sistema operando com alto número de partidas', pcauses: ['16', '25', '39'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Alta temperatura no ambiente de condensação', pcauses: ['18', '21', '22'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Baixa capacidade de refrigeração', pcauses: ['3', '39', '40', '5'], application: ['ar-condicionado', 'camara-fria', 'chiller', 'DUO'] },
  { text: 'Baixa troca de calor na condensadora', pcauses: ['38', '34'], application: ['ar-condicionado', 'camara-fria'] },
  { text: 'Baixa troca de calor na condensadora', pcauses: ['38', '41', '34'], application: ['chiller'] },
  { text: 'Baixa troca de calor na evaporadora com risco de congelamento', pcauses: ['11', '36', '28', '39'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Baixa troca de calor na evaporadora', pcauses: ['11', '36', '28', '39', '37'], application: ['ar-condicionado', 'camara-fria'] },
  { text: 'Baixa troca de calor na evaporadora', pcauses: ['11', '42', '43', '39', '37'], application: ['chiller'] },
  { text: 'Compressor Inoperante', pcauses: ['16'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Compressor Inoperante (L1 Virtual)', pcauses: ['16', '44', '45'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Risco de entrada de líquido no compressor', pcauses: ['2', '36', '28'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Sistema não refrigerando', application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Sistema operando com alto grau de utilização', pcauses: ['19', '24'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Sistema operando com alto número de partidas', pcauses: ['16', '25', '39'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Sistema sem fluido refrigerante', pcauses: ['3'], application: ['ar-condicionado', 'camara-fria', 'chiller'] },
  { text: 'Deficiência de fornecimento de água gelada', pcauses: ['30', '29'], application: ['fancoil'] },
  { text: 'Sistema com baixa troca de calor', pcauses: ['27', '23', '35'], application: ['fancoil'] },
  { text: 'Sistema sem troca de calor', pcauses: ['27', '23', '35'], application: ['fancoil'] },
  { text: 'Temperatura de saída alta', pcauses: ['20', '26'], application: ['fancoil'] },
  { text: 'Superaquecimento elevado', pcauses: ['1', '5'], application: ['ar-condicionado', 'camara-fria', 'chiller', 'fancoil'] },
  { text: 'Falha elétrica', pcauses: ['15'], application: ['ar-condicionado', 'camara-fria', 'chiller', 'fancoil'] },
];

export const falhaAssociadaAoLaudo: {
  laudo: string
  faultId: string
  healthIndex?: number
  application?: string,
}[] = [
  // A ordem é importante, os que têm "healthIndex" precisam vir antes da vesão deles sem "healthIndex".
  { laudo: 'Baixa troca de calor na evaporadora com risco de congelamento', faultId: 'baixa_troca_evap_laranja', healthIndex: 50, },
  { laudo: 'Baixa troca de calor na evaporadora com risco de congelamento', faultId: 'baixa_troca_calor_evap_dut_duo_o', healthIndex: 50, },
  { laudo: 'Baixa troca de calor na evaporadora com risco de congelamento', faultId: 'Baixa troca de calor na evaporadora com risco de congelamento', },
  { laudo: 'Alta temperatura no ambiente de condensação', faultId: 'Alta temperatura no ambiente de condensação', },
  { laudo: 'Baixa capacidade de refrigeração', faultId: 'baixa_cap_refri_dut_duo_o', healthIndex: 50, application: "EVAPORATOR-DUT" },
  { laudo: 'Baixa capacidade de refrigeração', faultId: 'baixa_cap_refri_dut_duo_y', healthIndex: 75, application: "EVAPORATOR-DUT" },
  { laudo: 'Baixa capacidade de refrigeração', faultId: 'baixa_cap_refri_or', healthIndex: 50 },
  { laudo: 'Baixa capacidade de refrigeração', faultId: 'Baixa capacidade de refrigeração', healthIndex: 75 },
  { laudo: 'Baixa troca de calor na condensadora', faultId: 'Baixa troca de calor na condensadora', },
  { laudo: 'Baixa troca de calor na evaporadora', faultId: 'Baixa troca de calor na evaporadora', },
  { laudo: 'Baixo uso de máquina', faultId: 'Baixo uso da máquina', },
  { laudo: 'Compressor Inoperante', faultId: 'Compressor Inoperante', },
  { laudo: 'Compressor Inoperante (L1 Virtual)', faultId: 'comp_inoperante_l1_virtual', },
  { laudo: 'Deficiência de fornecimento de água gelada', faultId: 'Deficiência de fornecimento de água gelada.', },
  { laudo: 'Falha elétrica', faultId: 'Falha elétrica', },
  { laudo: 'Sistema operando com alto número de partidas', faultId: 'Numero excessivo de partidas', },
  { laudo: 'Risco de entrada de líquido no compressor', faultId: 'Risco de entrada de líquido no compressor', },
  { laudo: 'Sistema sem fluido refrigerante', faultId: 'Sistema sem fluido refrigerante', },
  { laudo: 'Superaquecimento elevado', faultId: 'Superaquecimento elevado', },
  { laudo: 'Temperatura de saída alta', faultId: 'Temperatura de saída alta', },
];