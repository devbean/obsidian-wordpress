import { ButtonComponent, Notice, Setting, TFile, TFolder } from 'obsidian';
import type WordpressPlugin from './main';
import { AbstractModal } from './abstract-modal';
import { BatchPublishPlan, BatchPublishResult, buildBatchPublishPlan, collectBatchFiles } from './batch-publish';
import { PostStatus } from './wp-api';
import { WpProfile } from './wp-profile';
import { showError } from './utils';

export class BatchPublishModal extends AbstractModal {
  private selected: Set<string>;
  private profile: WpProfile;
  private status: PostStatus;
  private cancelled = false;
  private running = false;
  private closed = false;
  private preparing = false;
  private folder = '';
  private released = false;

  private release(): void {
    if (!this.released) {this.released = true; this.onDone();}
  }

  constructor(plugin: WordpressPlugin, files: TFile[], private readonly onDone: () => void, initialFolder = '') {
    super(plugin);
    this.selected = new Set(files.map(file => file.path));
    this.folder = initialFolder;
    this.profile = plugin.settings.profiles.find(profile => profile.isDefault) ?? plugin.settings.profiles[0];
    this.status = plugin.settings.defaultPostStatus === PostStatus.Future ? PostStatus.Draft : plugin.settings.defaultPostStatus;
  }

  onOpen(): void {
    this.modalEl.addClass('wp-batch-modal');
    this.renderSelection();
  }

  onClose(): void {
    this.closed = true;
    this.cancelled = true;
    if (!this.running) this.release();
    this.contentEl.empty();
  }

  private renderSelection(): void {
    const content = this.contentEl;
    content.empty();
    this.createHeader(this.t('batch_title'));
    new Setting(content).setName(this.t('batch_profile')).addDropdown(dropdown => {
      this.plugin.settings.profiles.forEach((profile,index) => dropdown.addOption(String(index),profile.name));
      dropdown.setValue(String(this.plugin.settings.profiles.indexOf(this.profile))).onChange(value => {
        this.profile = this.plugin.settings.profiles[Number(value)];
      });
    });
    new Setting(content).setName(this.t('publishModal_postStatus')).addDropdown(dropdown => {
      dropdown.addOption(PostStatus.Draft,this.t('publishModal_postStatusDraft'))
        .addOption(PostStatus.Publish,this.t('publishModal_postStatusPublish'))
        .addOption(PostStatus.Private,this.t('publishModal_postStatusPrivate'))
        .setValue(this.status).onChange(value => { this.status = value as PostStatus; });
    });
    const files = this.plugin.app.vault.getMarkdownFiles().sort((a,b) => a.path.localeCompare(b.path));
    const count = content.createEl('p', {cls:'wp-batch-summary'});
    const updateCount = (): void => { count.setText(this.t('batch_selectedCount',{count:String(this.selected.size)})); };
    let query = '';
    const list = content.createDiv({cls:'wp-batch-file-list'});
    const visibleFiles = (): TFile[] => files.filter(file => file.path.toLowerCase().includes(query))
      .sort((a,b) => Number(this.selected.has(b.path)) - Number(this.selected.has(a.path)) || a.path.localeCompare(b.path));
    const renderFiles = (): void => {
      list.empty();
      const filtered = visibleFiles();
      for (const file of filtered.slice(0,200)) {
        const row = list.createEl('label',{cls:'wp-batch-file'});
        const checkbox = row.createEl('input',{type:'checkbox'});
        checkbox.checked = this.selected.has(file.path);
        checkbox.addEventListener('change',() => {
          if (checkbox.checked) this.selected.add(file.path); else this.selected.delete(file.path);
          updateCount();
        });
        row.createSpan({text:file.path});
      }
      if (filtered.length > 200) list.createEl('p',{text:this.t('batch_filterHint')});
      if (!filtered.length) list.createEl('p',{text:this.t('batch_noNotes')});
      updateCount();
    };
    const controls = content.createDiv({cls:'wp-batch-selection-controls'});
    content.insertBefore(controls,list);
    new Setting(controls).setName(this.t('batch_folder')).setDesc(this.t('batch_folderDesc')).addDropdown(dropdown => {
      dropdown.addOption('',this.t('batch_manualSelection')).addOption('/',this.t('batch_vaultRoot'));
      for (const folder of this.plugin.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder && file.path !== '/').sort((a,b) => a.path.localeCompare(b.path))) {
        dropdown.addOption(folder.path,folder.path);
      }
      dropdown.setValue(this.folder).onChange(value => {
        this.folder = value;
        if (value) {
          const folder = this.plugin.app.vault.getAbstractFileByPath(value);
          const selectedFiles = folder instanceof TFolder ? collectBatchFiles(this.plugin.app,[folder]) : value === '/' ? files : [];
          this.selected = new Set(selectedFiles.map(file => file.path));
        }
        renderFiles();
      });
    });
    const search = controls.createEl('input',{type:'search',placeholder:this.t('batch_search'),cls:'wp-batch-search'});
    search.setAttribute('aria-label',this.t('batch_search'));
    search.addEventListener('input',() => {query = search.value.toLowerCase(); renderFiles();});
    const selectionButtons = controls.createDiv({cls:'wp-batch-actions'});
    new ButtonComponent(selectionButtons).setButtonText(this.t('batch_selectVisible')).onClick(() => {
      visibleFiles().forEach(file => this.selected.add(file.path)); renderFiles();
    });
    new ButtonComponent(selectionButtons).setButtonText(this.t('batch_clearSelection')).onClick(() => {
      this.selected.clear(); renderFiles();
    });
    renderFiles();
    const actions = content.createDiv({cls:'wp-batch-actions'});
    new ButtonComponent(actions).setButtonText(this.t('confirmModal_cancel')).onClick(() => this.close());
    new ButtonComponent(actions).setButtonText(this.t('batch_preview')).setCta().onClick(async () => {
      if (this.preparing) return;
      const chosen = files.filter(file => this.selected.has(file.path));
      if (!chosen.length) { new Notice(this.t('batch_noSelection')); return; }
      if (!this.profile.endpoint) { showError(this.t('error_noEndpoint')); return; }
      this.preparing = true;
      // Freeze target options while the read-only scan is running.
      const profile = this.profile;
      const status = this.status;
      content.querySelectorAll('input,select,button').forEach(el => (el as HTMLInputElement).disabled = true);
      const progress = content.createEl('p',{text:this.t('batch_scanning')});
      try {
        const plan = await buildBatchPublishPlan(this.plugin.app,chosen,profile);
        if (!this.closed) this.renderPreview(plan,profile,status);
      } catch (error) {
        if (!this.closed) { showError(error); progress.remove(); this.renderSelection(); }
      } finally { this.preparing = false; }
    });
  }

  private renderPreview(plan: BatchPublishPlan, profile: WpProfile, status: PostStatus): void {
    const content = this.contentEl;
    content.empty();
    this.createHeader(this.t('batch_confirmTitle'));
    const statusText = status === PostStatus.Publish ? this.t('publishModal_postStatusPublish') : status === PostStatus.Private ? this.t('publishModal_postStatusPrivate') : this.t('publishModal_postStatusDraft');
    content.createEl('p',{text:`${profile.name} · ${profile.endpoint} · ${statusText}`,cls:'wp-batch-summary'});
    content.createEl('p',{text:this.t('batch_confirmDesc')});
    const selected = plan.entries.filter(entry => entry.selected);
    const linked = plan.entries.filter(entry => !entry.selected);
    this.renderList(content,this.t('batch_selectedArticles',{count:String(selected.length)}),selected.map(entry => entry.file.path));
    this.renderList(content,this.t('batch_linkedArticles',{count:String(linked.length)}),linked.map(entry => entry.file.path));
    this.renderList(content,this.t('batch_attachments',{count:String(plan.attachments.length)}),plan.attachments.map(file => file.path));
    const crossProfile = plan.entries.filter(entry => entry.matter.postId && entry.matter.profileName && entry.matter.profileName !== profile.name);
    if (crossProfile.length) {
      content.createEl('p',{text:this.t('batch_crossProfileDesc'),cls:'wp-batch-warning'});
      this.renderList(content,this.t('batch_newOnThisSite'),crossProfile.map(entry => entry.file.path));
    }
    if (plan.warnings.length) {
      content.createEl('p',{text:this.t('batch_warningsDesc'),cls:'wp-batch-warning'});
      this.renderList(content,this.t('batch_warnings'),plan.warnings);
    }
    const actions = content.createDiv({cls:'wp-batch-actions'});
    new ButtonComponent(actions).setButtonText(this.t('common_back')).onClick(() => this.renderSelection());
    new ButtonComponent(actions).setButtonText(this.t('confirmModal_cancel')).onClick(() => this.close());
    new ButtonComponent(actions).setButtonText(this.t('batch_start',{count:String(plan.entries.length)})).setCta().onClick(() => {
      if (!this.running) void this.publish(plan,profile,status);
    });
  }

  private renderList(parent: HTMLElement, title: string, paths: string[]): void {
    const details = parent.createEl('details',{cls:'wp-batch-preview-list'});
    details.open = true;
    details.createEl('summary',{text:title});
    const list = details.createEl('ul');
    if (!paths.length) list.createEl('li',{text:this.t('batch_none')});
    for (const path of paths) list.createEl('li',{text:path});
  }

  private async publish(plan: BatchPublishPlan, profile: WpProfile, status: PostStatus): Promise<void> {
    this.running = true;
    this.cancelled = false;
    const content = this.contentEl;
    content.empty();
    this.createHeader(this.t('batch_publishing'));
    const progress = content.createEl('progress');
    progress.max = plan.entries.length;
    progress.value = 0;
    const current = content.createEl('p',{text:this.t('batch_preparing')});
    content.createEl('p',{text:this.t('batch_stopDesc')});
    const stop = new ButtonComponent(content).setButtonText(this.t('batch_stop')).onClick(() => {
      this.cancelled = true; stop.setDisabled(true); current.setText(this.t('batch_stopping'));
    });
    try {
      const {getWordPressClient} = await import('./wp-clients');
      const client = getWordPressClient(this.plugin,profile);
      if (!client) throw new Error(this.t('error_noProfile'));
      const result = await client.publishBatch(plan,{status,shouldCancel:() => this.cancelled,
        onProgress:(completed,total,file,repairing) => {
          if (this.closed) return;
          progress.max = total; progress.value = completed;
          current.setText(this.t(repairing ? 'batch_repairing' : 'batch_progress',{count:String(completed),total:String(total),path:file.path}));
        }});
      if (!this.closed) this.renderResult(result);
      else new Notice(this.resultSummary(result),15000);
    } catch (error) {
      if (!this.closed) {
        content.empty(); this.createHeader(this.t('batch_failed')); content.createEl('p',{text:error instanceof Error ? error.message : String(error)});
        new ButtonComponent(content).setButtonText(this.t('batch_close')).onClick(() => this.close());
      } else { showError(error); }
    } finally { this.running = false; this.release(); }
  }

  private resultSummary(result: BatchPublishResult): string {
    return this.t('batch_resultSummary',{success:String(result.items.filter(item => item.status === 'success').length),
      failed:String(result.items.filter(item => item.status === 'failed').length),skipped:String(result.items.filter(item => item.status === 'skipped').length)});
  }

  private renderResult(result: BatchPublishResult): void {
    const content = this.contentEl;
    content.empty();
    this.createHeader(this.t(result.cancelled ? 'batch_stopped' : 'batch_complete'));
    content.createEl('p',{text:this.resultSummary(result),cls:'wp-batch-summary'});
    for (const status of ['success','failed','skipped'] as const) {
      const items = result.items.filter(item => item.status === status);
      if (items.length) this.renderList(content,this.t(status === 'success' ? 'batch_success' : status === 'failed' ? 'batch_failed' : 'batch_skipped'),items.map(item => item.path + (item.error ? ': ' + item.error : '')));
    }
    const pending = result.items.filter(item => item.warnings?.length).map(item => item.path);
    if (pending.length) this.renderList(content,this.t('batch_pendingLinks'),pending);
    new ButtonComponent(content).setButtonText(this.t('batch_close')).onClick(() => this.close());
  }
}
