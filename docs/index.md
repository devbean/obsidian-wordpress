## Obsidian WordPress Plugin

This an obsidian plugin for publishing documents to WordPress CMS.

## How to install

The plugin could be installed in `Community plugins` by searching `wordpress` as keyword.

## How to use

Before publishing, necessary WordPress settings should be done in `WordPress` tab of Settings.

![Settings](/obsidian-wordpress/assets/images/settings-main.png)

You can find settings as following:

Let's say a WordPress could be access by https://www.mywp.com.

* **WordPress URL**: A full path of WordPress. It should be https://www.mywp.com.
* **API Type**: At this version we support following API types:
  * XML-RPC: Enabled by default but some host may disable it fot safety problems.
  * REST API Authentication by miniOrange: REST API is enabled by default
    but need plugin miniOrange installed in order to protect core writable APIs.

  **Note** The mentioned plugins muse be installed in WordPress and configured correctly as follows.
* **Show icon in sidebar**: Show WordPress logo in sidebar so you could click it
  to show a `Publish` pane in right side of application.
* **Default Post Status**: Default post status when publishing.

## How to config WordPress plugins

### WordPress REST API Authentication by miniOrange

In the plugin settings page, select `BASIC AUTHENTICATION`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-1.png)

In the next page, select `Username & Password with Base64 Encoding` then `Next`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-2.png)

Finally, click `Finish`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-3.png)

## How to use with WordPress.com

WordPress.com enables XML-RPC by default so you could select this API type.

When using with WordPress.com, the username may not be the same as your login username.
You could find the correct one here:

![wordpress.com users](/obsidian-wordpress/assets/images/wp-com-users.png)

And password should be the password of this username (usually the account login password).
