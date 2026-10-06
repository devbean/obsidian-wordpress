import { App, TAbstractFile, TFile, TFolder } from 'obsidian';
import { cloneDeep } from 'lodash-es';
import { WpProfile } from './wp-profile';
import { MatterData } from './types';
import { stripFrontmatter } from './utils';
import { decodeMediaSrc, expandNoteEmbeds, getFileReferences, isLocalFileReference } from './publish-converters';
import { WordPressClientResult, WordPressClientReturnCode, WordPressPublishResult } from './wp-client';

export interface BatchPublishEntry {
  file: TFile;
  content: string;
  matter: MatterData;
  selected: boolean;
  dependencies: string[];
}

export interface BatchPublishPlan {
  profileName: string;
  endpoint: string;
  entries: BatchPublishEntry[];
  attachments: TFile[];
  warnings: string[];
}

export interface BatchPublishItemResult {
  path: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  warnings?: string[];
}

export interface BatchPublishResult {
  items: BatchPublishItemResult[];
  cancelled: boolean;
}

export interface BatchPublishOptions {
  shouldCancel?: () => boolean;
  onProgress?: (completed: number, total: number, file: TFile, repairing: boolean) => void;
}

/** Folder selection includes descendants, and respects path boundaries. */
export function collectBatchFiles(app: App, selection: TAbstractFile[]): TFile[] {
  const folders = selection.filter((file): file is TFolder => file instanceof TFolder);
  const selected = new Set(selection.filter(file => file instanceof TFile && file.extension.toLowerCase() === 'md').map(file => file.path));
  return app.vault.getMarkdownFiles().filter(file => selected.has(file.path) || folders.some(folder =>
    folder.path === '/' || file.path.startsWith(folder.path.replace(/\/$/, '') + '/')))
    .sort((a,b) => a.path.localeCompare(b.path));
}

/** Read-only preflight. Every article that can be published is in this snapshot. */
export async function buildBatchPublishPlan(app: App, selectedFiles: TFile[], profile: WpProfile): Promise<BatchPublishPlan> {
  const selected = new Set(selectedFiles.filter(file => file.extension.toLowerCase() === 'md').map(file => file.path));
  const queue = [...new Map(selectedFiles.filter(file => selected.has(file.path)).map(file => [file.path,file])).values()];
  const queued = new Set(selected);
  const snapshots = new Map<string, Promise<string>>();
  const read = (file: TFile): Promise<string> => {
    let value = snapshots.get(file.path);
    if (!value) { value = app.vault.read(file); snapshots.set(file.path,value); }
    return value;
  };
  const snapshotApp = {metadataCache: app.metadataCache, vault: {read}} as App;
  const entries = new Map<string, BatchPublishEntry>();
  const attachments = new Map<string,TFile>();
  const warnings = new Set<string>();
  for (let index = 0; index < queue.length; index++) {
    const file = queue[index];
    const content = stripFrontmatter(await read(file));
    const expanded = await expandNoteEmbeds(snapshotApp, file, content);
    for (const failed of expanded.failed) warnings.add(`${file.path}: ![[${failed}]]`);
    const dependencies = new Set<string>();
    for (const text of new Set([content, expanded.content])) {
      for (const ref of getFileReferences(text)) {
        if (!isLocalFileReference(ref.src)) continue;
        const local = decodeMediaSrc(ref.src.split('#')[0]);
        if (!local) continue;
        const dest = app.metadataCache.getFirstLinkpathDest(local, file.path);
        if (!(dest instanceof TFile)) { warnings.add(`${file.path}: ${ref.src}`); continue; }
        if (dest.extension.toLowerCase() === 'md') {
          dependencies.add(dest.path);
          if (!queued.has(dest.path)) { queued.add(dest.path); queue.push(dest); }
        } else { attachments.set(dest.path,dest); }
      }
    }
    entries.set(file.path,{file,content: expanded.content,
      matter: cloneDeep(app.metadataCache.getFileCache(file)?.frontmatter ?? {}),
      selected: selected.has(file.path), dependencies: [...dependencies]});
  }
  // Iterative dependency ordering also handles cycles and long reference chains.
  const ordered: BatchPublishEntry[] = [];
  const visited = new Set<string>();
  for (const root of entries.keys()) {
    const stack: Array<{path: string, finish: boolean}> = [{path: root, finish: false}];
    while (stack.length) {
      const next = stack.pop()!;
      const entry = entries.get(next.path)!;
      if (next.finish) { ordered.push(entry); continue; }
      if (visited.has(next.path)) continue;
      visited.add(next.path);
      stack.push({path: next.path, finish: true});
      for (const dep of [...entry.dependencies].reverse()) {
        if (entries.has(dep) && !visited.has(dep)) stack.push({path: dep, finish: false});
      }
    }
  }
  return {profileName: profile.name, endpoint: profile.endpoint, entries: ordered,
    attachments: [...attachments.values()].sort((a,b) => a.path.localeCompare(b.path)), warnings: [...warnings]};
}

/** Sequential publishing; only the confirmed entries are ever handed to a client. */
export async function runBatchPublish(
  plan: BatchPublishPlan,
  publish: (entry: BatchPublishEntry, links: Map<string,string>, receipt?: WordPressPublishResult) => Promise<WordPressClientResult<WordPressPublishResult>>,
  options: BatchPublishOptions = {}
): Promise<BatchPublishResult> {
  const links = new Map<string,string>();
  for (const entry of plan.entries) {
    if ((!entry.matter.profileName || entry.matter.profileName === plan.profileName) && typeof entry.matter.postLink === 'string') {
      links.set(entry.file.path, entry.matter.postLink);
    }
  }
  const items = new Map<string,BatchPublishItemResult>();
  const receipts = new Map<string,WordPressPublishResult>();
  const repair = new Set<string>();
  let cancelled = false;
  for (const entry of plan.entries) {
    if (options.shouldCancel?.()) { cancelled = true; break; }
    options.onProgress?.(items.size,plan.entries.length,entry.file,false);
    const failed = entry.dependencies.filter(path => items.get(path)?.status === 'failed');
    if (failed.length) {
      items.set(entry.file.path,{path: entry.file.path,status:'failed',error: failed.join(', ')});
      continue;
    }
    if (entry.dependencies.some(path => !links.has(path))) repair.add(entry.file.path);
    try {
      const result = await publish(entry,links);
      if (result.code === WordPressClientReturnCode.OK) {
        receipts.set(entry.file.path,result.data);
        if (result.data.link) links.set(entry.file.path,result.data.link);
        items.set(entry.file.path,{path: entry.file.path,status:'success'});
      } else { items.set(entry.file.path,{path:entry.file.path,status:'failed',error:result.error.message}); }
    } catch (error) {
      items.set(entry.file.path,{path:entry.file.path,status:'failed',error: error instanceof Error ? error.message : String(error)});
    }
  }
  // In a cycle the earlier article gets its links refreshed after all IDs exist.
  for (const entry of plan.entries) {
    if (!repair.has(entry.file.path) || !receipts.has(entry.file.path)) continue;
    if (options.shouldCancel?.()) { cancelled = true; break; }
    if (entry.dependencies.some(path => !links.has(path) || items.get(path)?.status === 'failed')) continue;
    options.onProgress?.(items.size,plan.entries.length,entry.file,true);
    try {
      const result = await publish(entry,links,receipts.get(entry.file.path));
      if (result.code !== WordPressClientReturnCode.OK) {
        items.set(entry.file.path,{path:entry.file.path,status:'failed',error:result.error.message});
      } else { repair.delete(entry.file.path); }
    } catch (error) {
      items.set(entry.file.path,{path:entry.file.path,status:'failed',error: error instanceof Error ? error.message : String(error)});
    }
  }
  return {cancelled, items: plan.entries.map(entry => {
    const item = items.get(entry.file.path) ?? {path:entry.file.path,status:'skipped' as const};
    if (item.status === 'success' && repair.has(entry.file.path)) item.warnings = entry.dependencies;
    return item;
  })};
}
