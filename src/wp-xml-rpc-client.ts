import { App, MarkdownView, Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressClient, WordPressClientResult, WordPressClientReturnCode } from './wp-client';
import { XmlRpcClient } from './xmlrpc/client';
import { marked } from 'marked';

export class WpXmlRpcClient implements WordPressClient {

  private readonly client: XmlRpcClient;

  constructor(
    private readonly app: App,
    private readonly plugin: WordpressPlugin
  ) {
    this.client = new XmlRpcClient({
      url: new URL(plugin.settings.endpoint)
    });
  }

  newPost(): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        new WpLoginModal(
          this.app,
          this.plugin,
          (userName, password, modal) => {
            this.app.vault.read(activeView.file)
              .then(content => {
                const title = activeView.file.basename;
                return this.client.methodCall('wp.newPost', [
                  0,
                  userName,
                  password,
                  {
                    post_type: 'post',
                    post_status: 'draft',
                    post_title: title ?? 'A post from Obsidian!',
                    post_content: marked.parse(content) ?? '',
                  }
                ]);
              })
              .then((response: any) => { // eslint-disable-line
                if (response.faultCode && response.faultString) {
                  // it means error happens
                  new Notice(`Post published failed!\n${response.faultCode}: ${response.faultString}`);
                  return {
                    code: WordPressClientReturnCode.Error,
                    data: {
                      code: response.faultCode,
                      message: response.faultString
                    }
                  };
                } else {
                  new Notice('Post published successfully!');
                  modal.close();
                  return {
                    code: WordPressClientReturnCode.OK,
                    data: response
                  };
                }
              })
              .catch(error => {
                console.log('Reading file content for \'wp.newPost\' failed: ', error);
                new Notice(error.toString());
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
    private readonly onSubmit: (userName: string, password: string, modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'WordPress Login' });

    let password = '';
    new Setting(contentEl)
      .setName('User Name')
      .setDesc(`User name for ${this.plugin.settings.endpoint}`)
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
          this.onSubmit(this.plugin.settings.userName, password, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
