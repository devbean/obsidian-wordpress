import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WordpressPluginSettings, WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPostParams } from './wp-client';
import { getWordPressClient } from './wp-clients';
import { I18n } from './i18n';
import { CommentStatus, PostStatus } from './wp-api';
import { marked } from 'marked';

// import { mathjax } from 'mathjax-full/js/mathjax';
// import { TeX } from 'mathjax-full/js/input/tex';
// import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
// import { SVG } from 'mathjax-full/js/output/svg';
// import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
// import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';

export default class WordpressPlugin extends Plugin {

  #settings: WordpressPluginSettings | undefined;
  get settings() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#settings!;
  }

  #i18n: I18n | undefined;
  get i18n() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#i18n!;
  }

  private ribbonWpIcon: HTMLElement | null = null;

  async onload() {
    // const adaptor = liteAdaptor();
    // RegisterHTMLHandler(adaptor);
    // const mathjax_document = mathjax.document('', {
    //   InputJax: new TeX({ packages: AllPackages }),
    //   OutputJax: new SVG({ fontCache: 'local' })
    // });

    marked.use({
      extensions: [
        {
          name: 'mp_keep_inline',
          level: 'inline',
          start: (src) => src.indexOf('$'),
          tokenizer: (src, tokens) => {
            const match = src.match(/^\$([^$\n]+?)\$/);
            if (match) {
              return {
                type: 'mp_keep_inline',
                raw: match[0],
                text: match[1].trim()
              };
            }
          },
          renderer: (token) => {
            return `$${token.text}$`;
            // const node = mathjax_document.convert(token.text);
            // return adaptor.innerHTML(node);
          }
        },
        {
          name: 'mp_keep_block',
          level: 'block',
          start: (src) => src.indexOf('\n$$'),
          tokenizer: (src, tokens) => {
            const match = src.match(/^\$\$([\s\S]+?)\$\$/);
            if (match) {
              return {
                type: 'mp_keep_block',
                raw: match[0],
                text: match[1].trim()
              };
            }
          },
          renderer: (token) => {
            return `$$${token.text}$$\n`;
            // const node = mathjax_document.convert(token.text);
            // return adaptor.innerHTML(node);
          }
        }
      ]
    });

    console.log('loading obsidian-wordpress plugin');

    await this.loadSettings();

    // lang should be load early, but after settings
    this.#i18n = new I18n(this.#settings?.lang);

    addIcons();

    this.updateRibbonIcon();

    this.addCommand({
      id: 'defaultPublish',
      name: this.#i18n.t('command_publishWithDefault'),
      editorCallback: () => {
        const params: WordPressPostParams = {
          status: this.#settings?.defaultPostStatus ?? PostStatus.Draft,
          commentStatus: this.#settings?.defaultCommentStatus ?? CommentStatus.Open,
          categories: this.#settings?.lastSelectedCategories ?? [ 1 ],
          tags: [],
          title: '',
          content: ''
        };
        this.clientPublish(params);
      }
    });

    this.addCommand({
      id: 'publish',
      name: this.#i18n.t('command_publish'),
      editorCallback: () => {
        this.clientPublish();
      }
    });

    this.addSettingTab(new WordpressSettingTab(this.app, this));
  }

  onunload() {
  }

  async loadSettings() {
    this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.#settings);
  }

  updateRibbonIcon(): void {
    const ribbonIconTitle = this.#i18n?.t('ribbon_iconTitle') ?? 'WordPress';
    if (this.#settings?.showRibbonIcon) {
      if (!this.ribbonWpIcon) {
        this.ribbonWpIcon = this.addRibbonIcon('wp-logo', ribbonIconTitle, () => {
          this.clientPublish();
        });
      }
    } else {
      if (this.ribbonWpIcon) {
        this.ribbonWpIcon.remove();
        this.ribbonWpIcon = null;
      }
    }
  }

  private clientPublish(defaultPostParams?: WordPressPostParams): void {
    const client = getWordPressClient(this.app, this);
    if (client) {
      client.publishPost(defaultPostParams).then();
    }
  }

}
