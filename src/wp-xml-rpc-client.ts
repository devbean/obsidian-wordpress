import { WordPressClient, WordPressClientResult, WordPressClientReturnCode } from './wp-client';
import { Client, createClient, createSecureClient } from 'xmlrpc';
import { App, MarkdownView, Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { marked } from 'marked';

export class WpXmlRpcClient implements WordPressClient {

  private readonly client: Client;

  constructor(
    private readonly app: App,
    private readonly plugin: WordpressPlugin
  ) {
    const url = new URL(plugin.settings.endpoint);
    console.log(url);
    if (url.protocol === 'https:') {
      this.client = createSecureClient({
        host: url.hostname,
        port: 443,
        path: `${url.pathname}xmlrpc.php`
      });
    } else {
      this.client = createClient({
        host: url.hostname,
        port: 80,
        path: `${url.pathname}xmlrpc.php`
      });
    }
  }

  newPost(): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      const {workspace} = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        new WpLoginModal(
          this.app,
          this.plugin,
          (userName, password) => {
            const title = activeView.file.basename;
            const content = activeView.getViewData();
            this.client.methodCall('wp.newPost', [
              0,
              userName,
              password,
              {
                post_type: 'post',
                post_status: 'draft',
                post_title: title ?? 'A post from Obsidian!',
                post_content: marked.parse(content) ?? '',
              }
            ], (error: Error, value) => {
              console.log('Method response for \'wp.newPost\': ', value, error);
              if (error) {
                new Notice(`[Error] ${error.message}`);
                reject(error);
              } else {
                new Notice('Post published successfully!');
                resolve({
                  code: WordPressClientReturnCode.OK,
                  data: value
                });
              }
            });
          }
        ).open();
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject(new Error(error));
      }
    });
  }

}

class WpLoginModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly onSubmit: (userName: string, password: string) => void
  ) {
    super(app);
  }

  onOpen() {
    const {contentEl} = this;

    contentEl.createEl('h1', {text: 'WordPress Login'});

    let password = '';
    new Setting(contentEl)
      .setName('User Name')
      .addText(text => text
        .setValue(this.plugin.settings.userName ?? '')
        .onChange(async (value) => {
          if (this.plugin.settings.saveUserName) {
            this.plugin.settings.userName = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName('Password')
      .addText(text => text
        .onChange(async (value) => {
          password = value;
        }));
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Publish')
        .setClass('mod-cta')
        .onClick(() => {
          this.onSubmit(this.plugin.settings.userName, password);
        })
      );
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}
