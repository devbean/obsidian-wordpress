## Obsidian WordPress Plugin

This an obsidian plugin for publishing documents to WordPress CMS.

## How to install

The plugin could be installed in `Community plugins` by searching `wordpress` as keyword.

## How to use

Before publishing, necessary WordPress settings should be done in `WordPress` tab of Settings.

![Settings](/obsidian-wordpress/assets/images/settings-main.png)

You can find settings as following:

Let's say a WordPress could be access by https://www.mywp.com.

* **WordPress URL**: A full path of WordPress. It should be https://www.mywp.com. Note that if your site does not support URL rewrite, you may add `/index.php` appending to your domain.
* **API Type**: At this version we support following API types:
  * XML-RPC: Enabled by default but some hosts may disable it for safety problems.
  * REST API Authentication by miniOrange: REST API is enabled by default since WordPress 4.7. An extra plugin named miniOrange is needed to be installed and enabled in order to protect core writable APIs.
  * REST API Authentication by application password: REST API is enabled by default since WordPress 4.7 while application password was introduced in WordPress 5.6. If you are OK with WordPress 5.6, this is recommended as no plugin is needed.
  * REST API for wordpress.com only: REST API is enabled by default on wordpress.com.

  **Note** The mentioned plugins miniOrange must be installed and enabled in WordPress server and configured correctly as following steps.
* **Show icon in sidebar**: Show WordPress logo in sidebar so you could click it
  to publish current note.
* **Default Post Status**: Default post status when publishing.
* **Default Post Comment Status**: Default comment status when publishing.

## How to config WordPress plugins

### WordPress REST API Authentication by miniOrange

In the plugin settings page, select `BASIC AUTHENTICATION`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-1.png)

In the next page, select `Username & Password with Base64 Encoding` then `Next`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-2.png)

Finally, click `Finish`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-3.png)

## How to config application passwords

Application passwords was introduced in WordPress 5.6.

You need to login WordPress and navigate to 'Profile' page.

![applicationPasswords](/obsidian-wordpress/assets/images/wp-app-pwd-1.png)

You could use any application name you want, then click 'Add New Application Password' button.

![applicationPasswords](/obsidian-wordpress/assets/images/wp-app-pwd-2.png)

Here you need to save generated password as it only shows once. Spaces in the password will be ignored by WordPress automatically.

Then you could use your login username and the application password in Obsidian WordPress plugin.

## How to use with WordPress.com

WordPress.com supports OAuth 2.0 to protect REST API. This plugin add OAuth 2.0 for wordpress.com.

When using with WordPress.com, a valid wordpress.com site URL should be input first
(let's say https://yoursitename.wordpress.com). Then select 'REST API for wordpress.com', the browser
should be raised to open wordpress.com authorize page. After clicking 'Approve' button, obsidian.md
should be raised again and the plugin should be authorized.

**Note**, the plugin fetched wordpress.com token might be expired in two weeks by default. If publishes
failed some day, 'Refresh' button should be clicked in order to get a new token.
