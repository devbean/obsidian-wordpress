/**
 * Minimal stub of the `obsidian` module for running the markdown
 * conversion tests in plain Node.
 */

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: { mtime: number };

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() ?? path;
    const dot = this.name.lastIndexOf('.');
    this.basename = dot > 0 ? this.name.substring(0, dot) : this.name;
    this.extension = dot > 0 ? this.name.substring(dot + 1) : '';
    this.stat = { mtime: 0 };
  }
}

export class TFolder {
  constructor(public path: string) {}
}

export class Notice {
  constructor(public message: string | DocumentFragment, public timeout?: number) {
  }
}

export class Events {
  on(): unknown {
    return undefined;
  }

  off(): void {
  }

  offref(): void {
  }

  trigger(): void {
  }
}

export class Plugin {
  commands: Array<Record<string, unknown>> = [];
  addCommand(command: Record<string, unknown>): void {this.commands.push(command);}
  registerEvent(): void {}
  addSettingTab(): void {}
  registerObsidianProtocolHandler(): void {}
}

export const moment = {locale: () => 'zh-cn'};

export class PluginSettingTab {
}

export class Setting {
  constructor(public containerEl?: unknown) {
  }

  setName(): this {
    return this;
  }

  setDesc(): this {
    return this;
  }

  addText(): this {
    return this;
  }

  addToggle(): this {
    return this;
  }

  addDropdown(): this {
    return this;
  }

  addButton(): this {
    return this;
  }
}

export class ButtonComponent {}

export class Modal {
  static openHook?: (modal: Modal) => void;
  contentEl = {empty() {}};
  constructor(public app?: unknown) {
  }

  open(): void {
    Modal.openHook?.(this);
  }

  close(): void {
    this.onClose();
  }

  onOpen(): void {
  }

  onClose(): void {
  }
}

export const Platform = {
  isDesktop: true,
  isMobile: false,
};

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

export function addIcon(): void {
}

export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/');
}

let requestUrlHandler: ((request: unknown) => unknown) | undefined;
export function setRequestUrlHandler(handler?: (request: unknown) => unknown): void {
  requestUrlHandler = handler;
}

export function requestUrl(request: unknown): unknown {
  if (requestUrlHandler) return requestUrlHandler(request);
  throw new Error('not implemented in tests');
}

export function request(): unknown {
  throw new Error('not implemented in tests');
}
