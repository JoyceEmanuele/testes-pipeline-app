import i18next from '../i18n';

export function t(chave: string, lng: string){
    return i18next.t(chave, {lng: lng})
}

export function getLanguage(prefsUser: { // tipagem de notificações
        NOTIF_ID: number;
        USER_ID: string;
        PREFS: string;
    } | { // tipagem da tabela dashusers
        PREFS: string;
    }){
    const idioma:  'pt' | 'en' = prefsUser && prefsUser.PREFS && JSON.parse(prefsUser.PREFS).language ? JSON.parse(prefsUser.PREFS).language : 'pt';
    return idioma
}

export function verifyTranslationExists(translateKey: string, language: string) {
    return i18next.exists(translateKey) ? t(translateKey, language) : '-';
}