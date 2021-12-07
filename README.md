# obsidian-wordpress

This plugin makes you publish Obsidian documents to WordPress.

## How to use

First set your WordPress URL, user name and password in settings.

Put cursor in MarkDown editor use **Publish to WordPress** command in
[Command Palette](https://help.obsidian.md/Plugins/Command+palette).
The document will be published to WordPress that you set.

## Limits

The plugin uses XML-RPC to publish to WordPress. XML-RPC is enabled
by default of WordPress but some security experts suggest to disable it.
Some shared hosts might disable XML-RPC by default which you have
no way to enable it. So this won't work if XML-RPC is disabled.

This will be changed in the future by adding RESTful API support.
