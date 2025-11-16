# obsidian-wordpress-reloaded

This is a maintained fork of the [original obsidian-wordpress plugin](https://github.com/devbean/obsidian-wordpress).

## Why this fork?

The original plugin is no longer actively maintained. This fork aims to:
- Keep the plugin up-to-date with Obsidian's latest API
- Fix bugs and issues
- Add new features
- Provide active maintenance and support

This plugin makes you publish Obsidian documents to WordPress.

There are some introduction videos you can watch (from the original plugin):
* [YouTube (Chinese) by 简睿学堂-emisjerry](https://youtu.be/7YECfr_W1WM)
* [Bilibili (Chinese) by 简睿学堂-emisjerry](https://www.bilibili.com/video/BV1FT411A77m/?vd_source=8d3e1ef8cd3aab146af84cfad2f5076f)

## Features

All features from the original plugin, plus:
- Upload raw markdown content (new)
- More features coming soon...

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Original plugin by [devbean](https://github.com/devbean)
- Current maintainer: [bugparty](https://github.com/bugparty)

## License

Apache License 2.0, same as the original plugin.
