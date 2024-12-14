import * as i18next_ from "i18next";
import * as enJson from'./locales/en/translation.json';
import * as ptBRJson from './locales/pt-br/translation.json';
import * as Backend_ from "i18next-fs-backend";
import * as i18nextMiddleware from "i18next-http-middleware";
import { join } from 'path';

const i18next = i18next_ as unknown as (typeof i18next_.default);
const Backend = Backend_ as unknown as (typeof Backend_.default);

i18next.use(i18nextMiddleware.LanguageDetector).use(Backend).init({
    preload: ["en", "pt"],
    fallbackLng: 'pt',
    resources: {
      en: {
        translation: enJson,
      },
      pt: {
        translation: ptBRJson,
      },
    },
    defaultNS: 'translation',
    backend: {
      loadPath: join(__dirname, '/locales/{{lng}}/{{ns}}.json')
    },
  });

i18next.language = 'pt';

export default i18next;
