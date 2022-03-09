# obsidian-wordpress

This plugin makes you publish Obsidian documents to WordPress.

## How to use

Set your WordPress URL in settings as well as username if you want.

Put cursor in a MarkDown editor, then use **Publish to WordPress** in
[Command Palette](https://help.obsidian.md/Plugins/Command+palette)
or you could show a button in side in settings.
The document will be published to the WordPress URL that you set.

## Limits

This plugin uses XML-RPC or REST protocol to publish to WordPress.

XML-RPC is enabled by default but some may disable it because of security problems.
And some shared hosts might disable XML-RPC by default which you have
no way to enable it. So this won't work if XML-RPC is disabled.

REST is enabled by default but you should install some extra plugins
in order to protect writable APIs.

Read [this page](https://devbean.github.io/obsidian-wordpress) for details.
