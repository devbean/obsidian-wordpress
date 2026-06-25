# obsidian-wordpress

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/devbean)

This plugin makes you publish Obsidian documents to WordPress.

There are some introduction videos you can watch:
* [YouTube (Chinese) by 简睿学堂-emisjerry](https://youtu.be/7YECfr_W1WM)
* [Bilibili (Chinese) by 简睿学堂-emisjerry](https://www.bilibili.com/video/BV1FT411A77m/?vd_source=8d3e1ef8cd3aab146af84cfad2f5076f)

## Usages

Set your WordPress URL in settings as well as username if you want.

Put cursor in a MarkDown editor, then use **Publish to WordPress** in
[Command Palette](https://help.obsidian.md/Plugins/Command+palette)
or you could show a button in side in settings.
The document will be published to the WordPress URL that you set.

You could add YAML front matter in front of notes. The plugin will read
meta-data from front matter such as override title or tags.
Also, WordPress post ID and categories will be added to this front matter
if the note published successfully in order to support edit.

For example, you could add as following:

```markdown
---
title: Post title which will override note title, not required
tags:
  - any tag you want
  - not required
---
Note content here.
```

## Zotero and Zotpress Citation Support

This plugin can convert pandoc-style citations in your note to Zotpress shortcodes when publishing.

Supported source format in Obsidian:

```markdown
[[@citekey]]
[[@key1; @key2]]
[[@key,pp. 21-24]]
```

Published shortcode output examples:

```text
[zotpressInText item="{16058788:9ZU64DIJ}"]
[zotpressInText item="{16058788:7D6FGXB2},{16058788:W8HPAWWQ}"]
```

When bibliography auto-append is needed, the plugin appends:

```markdown
---

# Bibliography

[zotpressInTextBib style="apa" sortby="author" sort="ASC"]
```

### Required plugins and local services

To make citekey to item-key conversion work, you need all of the following:

1. WordPress plugin: Zotpress installed and activated on your WordPress site.
2. Zotero desktop app: running locally while publishing from Obsidian.
3. Zotero add-on: Better BibTeX for Zotero installed and enabled.
4. Better BibTeX JSON-RPC server reachable from Obsidian (default endpoint is `http://localhost:23119/better-bibtex/json-rpc`).

Optional but common in Obsidian workflows:

1. A citation management plugin that helps insert citekeys (for example, plugins that insert `[@key]` style references).

### New related settings

In plugin settings:

1. Format Zotpress shortcodes
  - Enables citation conversion during publish.
2. Resolve citekeys via Better BibTeX
  - Resolves citekeys like `@key` to Zotero library ID and item key.
3. Better BibTeX JSON-RPC endpoint
  - URL for Better BibTeX local API. Default: `http://localhost:23119/better-bibtex/json-rpc`.
4. Better BibTeX library selector
  - Optional selector passed to Better BibTeX when resolving items. Examples: `My Library`, `*`, or a library ID.
5. Fallback Zotpress library id
  - Used when library ID cannot be inferred from lookup response.

### Behavior and fallback

1. If resolution succeeds, citekeys are replaced with Zotpress-compatible `{libraryID:itemKey}` tuples.
2. If some citekeys cannot be resolved, unresolved citations are left unchanged in the content.
3. If Better BibTeX is unreachable, publish still continues and the plugin shows a warning notice.

## Limits

This plugin uses XML-RPC or REST protocol to publish to WordPress.

XML-RPC is enabled by default but some sites may disable it because of
security problems. While some shared hosts might disable XML-RPC by default
which you have no way to enable it. So this won't work if XML-RPC is disabled.

REST API is enabled since WordPress 4.7 by default. Some REST API
need extra actions in order to protect writable APIs.
Traditionally, it is done by installing plugins. WordPress 5.6 was introduced
application passwords to do similar things. So if you are OK with WordPress 5.6,
application passwords is preferred as no plugin in needed.

Read [this page](https://devbean.github.io/obsidian-wordpress) for more information.
