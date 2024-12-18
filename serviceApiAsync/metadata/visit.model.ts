export interface Visit{
    S_ID: number
    CLIENT_ID: number
    UNIT_ID: number
    TECNICO_ID: string
    VTDATE: string
    VTTIME: string
    AMBIENTES: number
    MAQUINAS: number
    CARACTERISTICA: number[]
    PLANTABAIXA_IMG: string[]
    AUTORIZACAO_IMG: string[]
    OBSERVACAO: string
    OBSERVACAO_REAGENDAMENTO: string
    RESPONSAVEL: string
    CITY_NAME: string
    CLIENT_NAME: string
    UNIT_NAME: string
    UNIT_LAT: string
    UNIT_LON: string
    RESPONSAVEL_NOME: string
    RESPONSAVEL_PHONE: string
    TECNICO_NOME: string
    TECNICO_SOBRENOME: string
    TECNICO_PHONE: string
    CIDADE_TECNICO: string
    STATUS_ID: number
    STATUS: string
}