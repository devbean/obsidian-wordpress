import * as http from 'http';
import * as https from 'https';
import { trim } from 'lodash-es';

interface CitationEntry {
  key: string;
  locator?: string;
}

interface CitationMatch {
  raw: string;
  start: number;
  end: number;
  entries: CitationEntry[];
}

interface ResolvedCitation {
  libraryId: string;
  itemKey: string;
}

interface ResolveCitekeysOptions {
  endpointUrl: string;
  librarySelector?: string;
  fallbackLibraryId?: string;
}

interface ResolveCitekeysResult {
  mapped: Record<string, ResolvedCitation>;
  unresolved: string[];
  error?: string;
}

export interface ConvertCitationsOptions extends ResolveCitekeysOptions {
  enabled: boolean;
  timeoutMs?: number; // unused, kept for API compatibility
}

export interface ConvertCitationsResult {
  content: string;
  unresolvedCitekeys: string[];
  lookupError?: string;
}

interface JsonRpcSuccess<T> {
  jsonrpc: '2.0';
  id: string;
  result: T;
}

interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string;
  error: {
    code: number;
    message: string;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcErrorResponse;

function parseCitationEntry(value: string): CitationEntry | null {
  const entry = trim(value);
  if (entry.length === 0 || !entry.startsWith('@')) {
    return null;
  }

  const withoutPrefix = trim(entry.slice(1));
  if (withoutPrefix.length === 0) {
    return null;
  }

  const separatorIndex = withoutPrefix.indexOf(',');
  if (separatorIndex < 0) {
    return {
      key: withoutPrefix,
    };
  }

  const key = trim(withoutPrefix.slice(0, separatorIndex));
  const locator = trim(withoutPrefix.slice(separatorIndex + 1));
  if (key.length === 0) {
    return null;
  }

  if (locator.length === 0) {
    return {
      key,
    };
  }

  return {
    key,
    locator,
  };
}

function findCitationMatches(content: string): CitationMatch[] {
  const regex = /\[\[\s*(@[^\]\n]+?)\s*\]\]/g;
  const matches: CitationMatch[] = [];

  let match = regex.exec(content);
  while (match !== null) {
    const body = match[1];
    const entries = body
      .split(';')
      .map(parseCitationEntry);

    if (entries.length > 0 && entries.every((entry) => entry !== null)) {
      matches.push({
        raw: match[0],
        start: match.index,
        end: match.index + match[0].length,
        entries: entries as CitationEntry[],
      });
    }
    match = regex.exec(content);
  }

  return matches;
}

function toZotpressInTextShortcode(entries: CitationEntry[], mapped: Record<string, ResolvedCitation>): string {
  const tuples = entries.map((entry) => {
    const resolved = mapped[entry.key];
    if (entry.locator) {
      return `{${resolved.libraryId}:${resolved.itemKey},${entry.locator}}`;
    }
    return `{${resolved.libraryId}:${resolved.itemKey}}`;
  });

  if (tuples.length === 1) {
    // Single citation: [zotpressInText item="{libraryId:itemKey}"]
    return `[zotpressInText item="${tuples[0]}"]`;
  }

  // Multiple citations: [zotpressInText item="{lib:key},{lib:key}"]
  return `[zotpressInText item="${tuples.join(',')}"]`;
}

function collectStringValues(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const values: string[] = [];
  const queue: unknown[] = [value];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || typeof next !== 'object') {
      continue;
    }

    for (const currentValue of Object.values(next as Record<string, unknown>)) {
      if (typeof currentValue === 'string') {
        values.push(currentValue);
      } else if (currentValue && typeof currentValue === 'object') {
        queue.push(currentValue);
      }
    }
  }

  return values;
}

function parseItemReferenceFromUri(uri: string): { libraryId: string; itemKey: string } | null {
  const pattern = /\/(users|groups)\/(\d+)\/items\/([A-Z0-9]{8})\b/i;
  const match = uri.match(pattern);
  if (!match) {
    return null;
  }
  return {
    libraryId: match[2],
    itemKey: match[3],
  };
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'number') {
    return `${value}`;
  }
  return null;
}

function extractFromUnknownItem(value: unknown, fallbackLibraryId?: string): ResolvedCitation | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  let libraryId = asString(source.libraryID)
    || asString(source.libraryId)
    || asString(source.userID)
    || asString(source.groupID)
    || null;
  let itemKey = asString(source.itemKey)
    || asString(source.key)
    || null;

  for (const str of collectStringValues(value)) {
    const parsed = parseItemReferenceFromUri(str);
    if (parsed) {
      libraryId = parsed.libraryId;
      itemKey = itemKey || parsed.itemKey;
      break;
    }
  }

  if (!itemKey) {
    const id = asString(source.id);
    if (id && /^[A-Z0-9]{8}$/i.test(id)) {
      itemKey = id;
    }
  }

  if (!libraryId && fallbackLibraryId) {
    libraryId = fallbackLibraryId;
  }

  if (!libraryId || !itemKey) {
    return null;
  }

  return {
    libraryId,
    itemKey,
  };
}

/**
 * Low-level HTTP POST using Node.js http/https modules.
 * This avoids Electron's net module (used by requestUrl / fetch) which causes
 * net::ERR_EMPTY_RESPONSE when connecting to Zotero's plain HTTP/1.1 server.
 */
function httpPost(endpointUrl: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(endpointUrl);
    } catch (e) {
      reject(new Error(`Invalid endpoint URL: ${endpointUrl}`));
      return;
    }

    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const port = parsed.port ? parseInt(parsed.port, 10) : (isHttps ? 443 : 80);
    const bodyBuf = Buffer.from(body, 'utf8');

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + (parsed.search ?? ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': bodyBuf.byteLength,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function callJsonRpc<T>(
  endpointUrl: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    params,
  });

  const responseText = await httpPost(endpointUrl, body);

  let payload: JsonRpcResponse<T>;
  try {
    payload = JSON.parse(responseText) as JsonRpcResponse<T>;
  } catch {
    throw new Error(`Invalid JSON from Better BibTeX: ${responseText.slice(0, 120)}`);
  }

  if ('error' in payload && payload.error) {
    throw new Error((payload as JsonRpcErrorResponse).error.message);
  }

  return (payload as JsonRpcSuccess<T>).result;
}

/**
 * Primary lookup: use item.search (string query) which returns CSL JSON with the Zotero
 * item URI in the 'id' field and the resolved citation key in the 'citekey' field.
 * This is the most reliable method because the URI format is stable and contains
 * both the library identifier and the item key needed for Zotpress shortcodes.
 */
async function resolveWithSearch(
  citekeys: string[],
  options: ResolveCitekeysOptions,
): Promise<ResolveCitekeysResult> {
  const mapped: Record<string, ResolvedCitation> = {};

  for (const citekey of citekeys) {
    try {
      // BBT item.search with a plain string searches citationKey among other fields
      const results = await callJsonRpc<Array<Record<string, unknown>>>(
        options.endpointUrl,
        'item.search',
        [citekey],
      );

      if (!Array.isArray(results) || results.length === 0) {
        console.warn(`[Zotpress] No BBT search results for citekey "${citekey}"`);
        continue;
      }

      // Prefer an exact citekey match; fall back to the sole result
      const item: Record<string, unknown> =
        results.find((r) => asString(r.citekey) === citekey) ??
        (results.length === 1 ? results[0] : null) as Record<string, unknown>;

      if (!item) {
        console.warn(`[Zotpress] Exact match not found for "${citekey}" among`, results.map((r) => r.citekey));
        continue;
      }

      // The CSL JSON 'id' field is the Zotero item URI, e.g.
      // http://zotero.org/users/16058788/items/9ZU64DIJ
      const uri = asString(item.id);
      if (uri) {
        const parsed = parseItemReferenceFromUri(uri);
        if (parsed) {
          mapped[citekey] = parsed;
          console.log(`[Zotpress] Resolved "${citekey}" → ${parsed.libraryId}:${parsed.itemKey}`);
          continue;
        }
      }

      // URI parse failed — try direct field extraction + fallback library id
      const extracted = extractFromUnknownItem(item, options.fallbackLibraryId);
      if (extracted) {
        mapped[citekey] = extracted;
        console.log(`[Zotpress] Resolved "${citekey}" via fields → ${extracted.libraryId}:${extracted.itemKey}`);
      } else {
        console.warn(`[Zotpress] Could not extract libraryId/itemKey for "${citekey}". URI: "${uri}"`);
      }
    } catch (err) {
      console.error(`[Zotpress] item.search failed for "${citekey}":`, err);
    }
  }

  return { mapped, unresolved: citekeys.filter((k) => !mapped[k]) };
}

/**
 * Fallback lookup: export the unresolved citekeys via BBT JSON translator.
 * BBT JSON includes 'libraryID' and 'itemKey' directly on each item object.
 */
async function resolveWithBbtJsonExport(
  citekeys: string[],
  options: ResolveCitekeysOptions,
): Promise<ResolveCitekeysResult> {
  const params: unknown[] = [citekeys, 'BetterBibTeX JSON'];
  if (options.librarySelector && options.librarySelector.trim().length > 0) {
    params.push(options.librarySelector.trim());
  }

  const exportRaw = await callJsonRpc<string>(options.endpointUrl, 'item.export', params);
  const exportJson = JSON.parse(exportRaw) as {
    items?: Array<Record<string, unknown>>;
  };

  const mapped: Record<string, ResolvedCitation> = {};
  for (const item of exportJson.items ?? []) {
    const citekey = asString(item.citationKey);
    if (!citekey || !citekeys.includes(citekey)) {
      continue;
    }
    // Try URI first, then direct field extraction
    const uriStr = collectStringValues(item).find((s) => parseItemReferenceFromUri(s) !== null);
    const parsed = uriStr ? parseItemReferenceFromUri(uriStr) : null;
    const resolved = parsed ?? extractFromUnknownItem(item, options.fallbackLibraryId);
    if (resolved) {
      mapped[citekey] = resolved;
      console.log(`[Zotpress] Fallback resolved "${citekey}" → ${resolved.libraryId}:${resolved.itemKey}`);
    }
  }

  return { mapped, unresolved: citekeys.filter((k) => !mapped[k]) };
}

async function resolveCitekeys(citekeys: string[], options: ResolveCitekeysOptions): Promise<ResolveCitekeysResult> {
  if (citekeys.length === 0) {
    return { mapped: {}, unresolved: [] };
  }

  try {
    const primary = await resolveWithSearch(citekeys, options);
    if (primary.unresolved.length === 0) {
      return primary;
    }

    console.log(`[Zotpress] ${primary.unresolved.length} citekey(s) unresolved after search, trying export fallback`);
    const fallback = await resolveWithBbtJsonExport(primary.unresolved, options);
    return {
      mapped: { ...primary.mapped, ...fallback.mapped },
      unresolved: fallback.unresolved,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Better BibTeX lookup error';
    console.error('[Zotpress] resolveCitekeys failed:', message);
    return { mapped: {}, unresolved: citekeys, error: message };
  }
}

export async function convertPandocCitationsToZotpress(
  content: string,
  options: ConvertCitationsOptions,
): Promise<ConvertCitationsResult> {
  if (!options.enabled) {
    return {
      content,
      unresolvedCitekeys: [],
    };
  }

  const matches = findCitationMatches(content);
  if (matches.length === 0) {
    return {
      content,
      unresolvedCitekeys: [],
    };
  }

  const citekeys = Array.from(new Set(matches.flatMap((match) => match.entries.map((entry) => entry.key))));
  const resolved = await resolveCitekeys(citekeys, {
    endpointUrl: options.endpointUrl,
    librarySelector: options.librarySelector,
    fallbackLibraryId: options.fallbackLibraryId,
  });

  let output = '';
  let cursor = 0;
  for (const match of matches) {
    output += content.slice(cursor, match.start);
    const canReplace = match.entries.every((entry) => !!resolved.mapped[entry.key]);
    output += canReplace ? toZotpressInTextShortcode(match.entries, resolved.mapped) : match.raw;
    cursor = match.end;
  }
  output += content.slice(cursor);

  return {
    content: output,
    unresolvedCitekeys: resolved.unresolved,
    lookupError: resolved.error,
  };
}
