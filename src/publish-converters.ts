import { App, TFile } from 'obsidian';
import fileTypeChecker from 'file-type-checker';
import { SafeAny, stripFrontmatter } from './utils';
import { WpProfile } from './wp-profile';
import { WikiLinkResolution } from './markdown-it-wikilink-plugin';
import MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it/lib/rules_inline/link.mjs';
import markdownImage from 'markdown-it/lib/rules_inline/image.mjs';

/**
 * The maximum depth of nested note embeds (`![[note]]`).
 */
const MAX_EMBED_DEPTH = 5;

/**
 * Media file extensions which should be rendered as images.
 */
export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'apng', 'ico',
]);

/**
 * Fallback mime types by file extension, used when the file type
 * cannot be detected from the binary content.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  apng: 'image/apng',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  txt: 'text/plain',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * A media reference found in note content, either Obsidian wiki
 * embed syntax `![[path|100|alt]]` or markdown image syntax
 * `![alt|100x200](<path> "title")`.
 */
export interface MediaRef {
  start: number;
  end: number;
  /**
   * The original text of the whole reference.
   */
  original: string;

  /**
   * The media linkpath, or URL for remote media.
   */
  src: string;

  altText?: string;

  width?: string;
  height?: string;

  isUrl: boolean;

  syntax: 'markdown' | 'wiki' | 'markdown-link' | 'wiki-link';
  title?: string;
}

const WIKI_EMBED_RE = /!\[\[([^|\]\n]+)(?:\|([^\]\n]+))?\]\]/g;

/** Uses CommonMark's link rules for inline and reference-style local links. */
export function getMarkdownLinkRefs(content: string): MediaRef[] {
  return getMarkdownRefs(content, false);
}

function getMarkdownRefs(content: string, images: boolean): MediaRef[] {
  const md = new MarkdownIt();
  const env = {};
  md.parse(content, env);
  const excluded = findExcludedRanges(content);
  const refs: MediaRef[] = [];
  for (let pos = 0; pos < content.length; pos++) {
    const image = content[pos] === '!' && content[pos + 1] === '[';
    if (images !== image) continue;
    if (!image && content[pos] !== '[') continue;
    if (content[pos + (image ? 2 : 1)] === '[' || (!image && (content[pos - 1] === '[' || content[pos - 1] === '!'))) continue;
    if (inRanges(pos, excluded) || isEscaped(content, pos)) continue;
    const state = new md.inline.State(content, md, env, []);
    state.pos = pos;
    const labelStart = pos + (image ? 1 : 0);
    const labelEnd = md.helpers.parseLinkLabel(state, labelStart, !image);
    if (labelEnd < 0) continue;
    // Reference definitions are block syntax, not links to replace.
    const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
    if (!image && content[labelEnd + 1] === ':' && /^ {0,3}$/.test(content.slice(lineStart, pos))) continue;
    if (!(image ? markdownImage : markdownLink)(state, false)) continue;
    const token = state.tokens.find(it => it.type === (image ? 'image' : 'link_open'));
    let src = token?.attrGet(image ? 'src' : 'href');
    if (!src) continue;
    if (content[labelEnd + 1] === '(') {
      let start = labelEnd + 2;
      while (/\s/.test(content[start] ?? '') && start < state.pos) start++;
      const destination = md.helpers.parseLinkDestination(content, start, state.pos);
      if (destination.ok) src = destination.str;
    }
    let altText = content.slice(labelStart + 1, labelEnd);
    let width: string | undefined;
    let height: string | undefined;
    if (image) {
      const size = altText.match(/\|(\d+)(?:x(\d+))?$/);
      if (size) { width = size[1]; height = size[2]; altText = altText.slice(0, size.index); }
    }
    refs.push({start: pos, end: state.pos, original: content.slice(pos, state.pos), src,
      altText, width, height, isUrl: isValidHttpUrl(src), syntax: image ? 'markdown' : 'markdown-link',
      title: token?.attrGet('title') ?? undefined});
    pos = state.pos - 1;
  }
  return refs;
}

/** Includes wiki links and embeds, and ordinary Markdown attachment/note links. */
export function getFileReferences(content: string): MediaRef[] {
  const refs = [...getMediaRefs(content), ...getMarkdownLinkRefs(content)];
  const excluded = findExcludedRanges(content);
  const wiki = /\[\[([^|\]\n]+)(?:\|([^\]\n]+))?\]\]/g;
  for (const match of content.matchAll(wiki)) {
    const start = match.index!;
    if (content[start - 1] === '!' || isEscaped(content, start) || inRanges(start, excluded)) continue;
    refs.push({start, end: start + match[0].length, original: match[0], src: match[1].trim(),
      altText: match[2] ?? match[1], isUrl: isValidHttpUrl(match[1]), syntax: 'wiki-link'});
  }
  return refs.sort((a,b) => a.start - b.start);
}

export function isLocalFileReference(src: string): boolean {
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(src);
}

export function markdownLinkReplacement(ref: MediaRef, url: string): string {
  const title = ref.title ? ' "' + ref.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : '';
  let label = ref.syntax === 'wiki-link' ? (ref.altText ?? '').replace(/([\\\[\]])/g, '\\$1') : ref.altText ?? '';
  if (ref.syntax === 'markdown' && ref.width) label += '|' + ref.width + (ref.height ? 'x' + ref.height : '');
  return `[${label}](<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}>${title})`;
}

/**
 * Returns the `[start, end)` ranges of fenced code blocks and inline
 * code spans in the content. Embed/media syntax inside code must be
 * left untouched, it is part of the code, not of the note structure.
 */
export function findCodeRanges(content: string): Array<[ number, number ]> {
  const ranges: Array<[ number, number ]> = [];
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') lineStarts.push(i + 1);
  }
  // Let CommonMark identify fences inside lists/quotes and indented code.
  const tokens = new MarkdownIt().parse(content, {});
  for (const token of tokens) {
    if ((token.type === 'fence' || token.type === 'code_block') && token.map) {
      ranges.push([lineStarts[token.map[0]], lineStarts[token.map[1]] ?? content.length]);
    }
  }
  // Code spans can contain newlines and shorter backtick runs.
  for (const token of tokens) {
    if (token.type !== 'inline' || !token.map) continue;
    const regionEnd = lineStarts[token.map[1]] ?? content.length;
    const ticks = /`+/g;
    ticks.lastIndex = lineStarts[token.map[0]];
    let match: RegExpExecArray | null;
    while ((match = ticks.exec(content)) !== null && match.index < regionEnd) {
      if (inRanges(match.index, ranges) || isEscaped(content, match.index)) continue;
      const close = /`+/g;
      close.lastIndex = ticks.lastIndex;
      let end: RegExpExecArray | null;
      while ((end = close.exec(content)) !== null && end.index < regionEnd) {
        if (inRanges(end.index, ranges)) break;
        if (end[0].length === match[0].length) {
          ranges.push([match.index, close.lastIndex]);
          ticks.lastIndex = close.lastIndex;
          break;
        }
      }
    }
  }
  return ranges;
}

function isEscaped(content: string, index: number): boolean {
  let slashes = 0;
  while (index > 0 && content[--index] === '\\') slashes++;
  return slashes % 2 === 1;
}

function findExcludedRanges(content: string): Array<[number, number]> {
  const ranges = findCodeRanges(content);
  const comments = /%%/g;
  let open: number | undefined;
  let match: RegExpExecArray | null;
  while ((match = comments.exec(content)) !== null) {
    if (open !== undefined) {
      ranges.push([open, comments.lastIndex]);
      open = undefined;
    } else if (!inRanges(match.index, ranges) && !isEscaped(content, match.index)) {
      open = match.index;
    }
  }
  if (open !== undefined && /^\s*%%/.test(content.slice(content.lastIndexOf('\n', open - 1) + 1, open + 2))) {
    ranges.push([open, content.length]);
  }
  return ranges;
}

export function replaceContentRanges(content: string, replacements: Array<{start: number, end: number, replacement: string}>): string {
  for (const {start, end, replacement} of [...replacements].sort((a, b) => b.start - a.start)) {
    content = content.slice(0, start) + replacement + content.slice(end);
  }
  return content;
}

function inRanges(index: number, ranges: Array<[ number, number ]>): boolean {
  return ranges.some(([ start, end ]) => index >= start && index < end);
}

/**
 * Extracts all media references from the content. References inside
 * code fences and inline code spans are ignored.
 */
export function getMediaRefs(content: string): MediaRef[] {
  const refs: MediaRef[] = getMarkdownRefs(content, true);
  const codeRanges = findExcludedRanges(content);

  let match: RegExpExecArray | null;
  WIKI_EMBED_RE.lastIndex = 0;
  while ((match = WIKI_EMBED_RE.exec(content)) !== null) {
    if (inRanges(match.index, codeRanges) || isEscaped(content, match.index)) {
      continue;
    }
    const src = match[1].trim();
    // match[2] could be a size (`100` or `100x200`) or an alt text
    let altText: string | undefined;
    let width: string | undefined;
    let height: string | undefined;
    const suffix = match[2]?.trim();
    if (suffix) {
      if (/^\d+(x\d+)?$/.test(suffix)) {
        const sizeParts = suffix.split('x');
        width = sizeParts[0];
        height = sizeParts[1];
      } else {
        altText = suffix;
      }
    }
    refs.push({
      start: match.index,
      end: match.index + match[0].length,
      original: match[0],
      src,
      altText,
      width,
      height,
      isUrl: isValidHttpUrl(src),
      syntax: 'wiki',
    });
  }

  return refs.sort((a, b) => a.start - b.start);
}

/**
 * Decodes a media src. Returns the original string if it is not
 * a valid encoded URI (e.g. it contains a bare `%`).
 */
export function decodeMediaSrc(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

export function mimeTypeFor(file: TFile, content?: ArrayBuffer): string {
  const byExt = MIME_BY_EXTENSION[file.extension.toLowerCase()];
  if (byExt) {
    return byExt;
  }
  if (content) {
    const detected = fileTypeChecker.detectFile(content);
    if (detected?.mimeType) {
      return detected.mimeType;
    }
  }
  return 'application/octet-stream';
}

export function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts the section under a heading (or a block reference) from
 * the note content. Returns `undefined` if the heading is not found.
 */
export function extractSection(content: string, subpath: string): string | undefined {
  if (subpath.startsWith('^')) {
    // block reference
    const blockId = subpath.substring(1);
    return extractBlockReference(content, blockId);
  }

  const lines = content.split(/\r?\n/);
  const headingRe = /^(#{1,6})\s+(.*)$/;
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (m && m[2].trim().toLowerCase() === subpath.trim().toLowerCase()) {
      start = i;
      level = m[1].length;
      break;
    }
  }
  if (start < 0) {
    return undefined;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function extractBlockReference(content: string, blockId: string): string | undefined {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].endsWith(`^${blockId}`)) {
      let line = lines[i].replace(/\s\^[\w-]+$/, '');
      // merge list items of the following lines which belong to this block
      const isList = /^(\s*[-*+]|\s*\d+\.)\s/.test(line);
      if (isList) {
        let end = i + 1;
        while (end < lines.length && /^(\s+([-*+]|\d+\.)\s|\s{2,}\S)/.test(lines[end])) {
          end++;
        }
        line = lines.slice(i, end).map(it => it.replace(/\s\^[\w-]+$/, '')).join('\n');
      }
      return line.trim();
    }
  }
  return undefined;
}

/**
 * Collects the wikilink targets (`[[note]]`, `[[note|alias]]`,
 * `[[note#heading]]`) from the content. Embeds (`![[...]]`), links
 * inside code and targets that are empty after stripping alias and
 * subpath are ignored.
 */
export function collectWikiLinkTargets(content: string): string[] {
  const codeRanges = findExcludedRanges(content);
  const targets: string[] = [];
  const seen = new Set<string>();
  const re = /\[\[([^\][\n]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > 0 && content[match.index - 1] === '!') {
      continue;
    }
    if (inRanges(match.index, codeRanges) || isEscaped(content, match.index)) {
      continue;
    }
    const target = match[1].split('|')[0].split('#')[0].trim();
    if (target.length > 0 && !seen.has(target)) {
      seen.add(target);
      targets.push(target);
    }
  }
  return targets;
}

export interface EmbedExpandResult {
  content: string;

  /**
   * Paths of notes which could not be embedded (not found or cyclic).
   */
  failed: string[];
}

/**
 * Recursively expands Obsidian note embeds `![[note]]` and
 * `![[note#heading]]` into the note content.
 *
 * Markdown note embeds are not media files and must not be uploaded
 * to the WordPress media library. Embeds of non-markdown files are
 * left untouched, they are handled by the media upload pipeline.
 */
export async function expandNoteEmbeds(
  app: App,
  sourceFile: TFile,
  content: string,
  options: {
    depth?: number;
    visited?: Set<string>;
  } = {}
): Promise<EmbedExpandResult> {
  const depth = options.depth ?? 0;
  const visited = options.visited ?? new Set<string>([ sourceFile.path ]);
  const failed: string[] = [];

  const embedRe = /!\[\[([^\][|\n]+?)(#[^\][|\n]*)?(?:\|[^\][\n]*)?\]\]/g;
  // collect matches first, then replace from the last one to keep indices valid
  const matches = [ ...content.matchAll(embedRe) ].reverse();
  const codeRanges = findExcludedRanges(content);

  let result = content;
  for (const match of matches) {
    const original = match[0];
    const target = match[1];
    const subpath = match[2];
    const matchIndex = match.index ?? 0;
    if (inRanges(matchIndex, codeRanges) || isEscaped(content, matchIndex)) {
      // embeds inside code fences or inline code are part of the code
      continue;
    }
    const dest = app.metadataCache.getFirstLinkpathDest(target.trim(), sourceFile.path);
    if (!(dest instanceof TFile) || dest.extension !== 'md') {
      continue;
    }
    if (visited.has(dest.path) || depth >= MAX_EMBED_DEPTH) {
      failed.push(target.trim());
      result = result.slice(0, matchIndex) + '\\' + original + result.slice(matchIndex + original.length);
      continue;
    }
    visited.add(dest.path);
    try {
      let embedded = stripFrontmatter(await app.vault.read(dest));
      if (subpath) {
        const section = extractSection(embedded, subpath.substring(1));
        if (section === undefined) {
          failed.push(target.trim() + subpath);
          result = result.slice(0, matchIndex) + '\\' + original + result.slice(matchIndex + original.length);
          continue;
        }
        embedded = section;
      }
      const nested = await expandNoteEmbeds(app, dest, rebaseNoteReferences(app, dest, embedded), {
        depth: depth + 1,
        visited,
      });
      failed.push(...nested.failed);
      result = result.substring(0, matchIndex) + nested.content + result.substring(matchIndex + original.length);
    } finally {
      visited.delete(dest.path);
    }
  }

  return { content: result, failed };
}

/** Resolve references before flattening a child note into another note. */
function rebaseNoteReferences(app: App, sourceFile: TFile, content: string): string {
  let result = content;
  // A link label can contain an image. Re-scan after changing its inner image
  // rather than replacing overlapping parent/child ranges from one snapshot.
  for (const scan of [getMediaRefs, getMarkdownLinkRefs]) {
    const edits: Array<{start: number, end: number, replacement: string}> = [];
    for (const ref of scan(result)) {
      if (!isLocalFileReference(ref.src)) continue;
      const [localPath, ...fragment] = ref.src.split('#');
      const dest = app.metadataCache.getFirstLinkpathDest(decodeMediaSrc(localPath), sourceFile.path);
      if (!dest) continue;
      const suffix = fragment.length ? '#' + fragment.join('#') : '';
      const target = ref.syntax.startsWith('markdown')
        ? dest.path.split('/').map(encodeURIComponent).join('/') + suffix
        : dest.path + suffix;
      const offset = ref.syntax.startsWith('markdown') ? ref.original.indexOf('](') + 2 : 3;
      const start = ref.original.indexOf(ref.src, offset);
      const replacement = ref.syntax.startsWith('markdown')
        ? (ref.syntax === 'markdown' ? '!' : '') + markdownLinkReplacement(ref, target)
        : start >= 0 ? ref.original.slice(0,start) + target + ref.original.slice(start + ref.src.length) : ref.original;
      edits.push({start:ref.start, end:ref.end, replacement});
    }
    result = replaceContentRanges(result,edits);
  }
  const replacements: Array<{start: number, end: number, replacement: string}> = [];
  const ranges = findExcludedRanges(result);
  const links = /\[\[([^\][\n]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = links.exec(result)) !== null) {
    if (result[match.index - 1] === '!' || isEscaped(result,match.index) || inRanges(match.index,ranges)) continue;
    const [target, ...aliasParts] = match[1].split('|');
    const [localPath, ...subpathParts] = target.split('#');
    const dest = app.metadataCache.getFirstLinkpathDest(localPath.trim(),sourceFile.path);
    if (!dest) continue;
    const subpath = subpathParts.length ? '#' + subpathParts.join('#') : '';
    const display = aliasParts.length ? aliasParts.join('|') : localPath.trim() + (subpath ? ' > ' + subpath.slice(1) : '');
    replacements.push({start:match.index,end:links.lastIndex,replacement:`[[${dest.path}${subpath}|${display}]]`});
  }
  return replaceContentRanges(result,replacements);
}

/**
 * Creates a wikilink resolver used by the wikilink markdown-it plugin.
 *
 * A wikilink is converted to a permalink when its target note has been
 * published with the same profile. Unpublished targets are rendered
 * as plain text.
 *
 * @param publishedLinks in-memory permalinks of notes published during
 * the same run, used because the metadata cache may not have picked up
 * the freshly written frontmatter yet.
 */
export function createWikiLinkResolver(
  app: App,
  profile: WpProfile,
  sourceFile: TFile,
  publishedLinks?: Map<string, string>
): (linkpath: string) => WikiLinkResolution | undefined {
  return (linkpath: string): WikiLinkResolution | undefined => {
    const hashIndex = linkpath.indexOf('#');
    const path = hashIndex >= 0 ? linkpath.substring(0, hashIndex) : linkpath;
    const subpath = hashIndex >= 0 ? linkpath.substring(hashIndex + 1) : undefined;

    const dest = app.metadataCache.getFirstLinkpathDest(path, sourceFile.path);
    if (!dest) {
      return { exists: false, subpath };
    }
    const override = publishedLinks?.get(dest.path);
    if (override) {
      return { exists: true, permalink: override, subpath };
    }
    const frontmatter: SafeAny = app.metadataCache.getFileCache(dest)?.frontmatter;
    const permalink = typeof frontmatter?.postLink === 'string' ? frontmatter.postLink : undefined;
    const publishedWithSameProfile = !frontmatter?.profileName || frontmatter.profileName === profile.name;
    return {
      exists: true,
      permalink: publishedWithSameProfile ? permalink : undefined,
      subpath,
    };
  };
}
