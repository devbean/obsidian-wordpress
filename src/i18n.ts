import { LANGUAGES } from './i18n/langs';
import { moment } from 'obsidian';
import { template } from 'lodash-es';

export type Language = keyof typeof LANGUAGES;
export type LanguageWithAuto = Language | 'auto';
export type TranslateKey = keyof typeof LANGUAGES['en'];

export class I18n {

  constructor(
    private readonly lang: LanguageWithAuto = 'auto'
  ) {
    this.lang = lang;
  }

  t(key: TranslateKey, vars?: Record<string, string>): string {
    const string = this.#get(key);
    if (vars) {
      const compiled = template(string);
      return compiled(vars);
    } else {
      return string;
    }
  }

  #get(key: TranslateKey): string {
    let lang: Language;
    if (this.lang === 'auto' && moment.locale().replace('-', '_') in LANGUAGES) {
      lang = moment.locale().replace('-', '_') as Language;
    } else {
      lang = 'en';
    }
    return LANGUAGES[lang][key] || LANGUAGES['en'][key] || key;
  }

}
