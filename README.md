# obsidian-wordpress

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/devbean)

This plugin makes you publish Obsidian documents to WordPress.

There are some introduction videos you can watch:
* [YouTube (Chinese) by 简睿学堂-emisjerry](https://youtu.be/7YECfr_W1WM)
* [Bilibili (Chinese) by 简睿学堂-emisjerry](https://www.bilibili.com/video/BV1FT411A77m/?vd_source=8d3e1ef8cd3aab146af84cfad2f5076f)

## How to use

Set your WordPress URL in settings as well as username if you want.

Put cursor in a MarkDown editor, then use **Publish to WordPress** in
[Command Palette](https://help.obsidian.md/Plugins/Command+palette)
or you could show a button in side in settings.
The document will be published to the WordPress URL that you set.

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
