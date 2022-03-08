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
* **Save User Name**: Both user name and password must be given before publishing.
  If this checked, we will remember user name so you can skip input every time.
  For security reason, no password will be stored at this version.
* **API Type**: At this version we support following API types:
  * XML-RPC: Enabled by default but some host may disable it fot safety problems.
  * REST API: Enabled by default but need extra plugins to protect core writable APIs.
  
  If XML-RPC selected, no more actions while if REST API selected, which plugin need to be decided. We now support
  following plugins:
  * WordPress REST API Authentication by miniOrange
  
  **Note** The plugin you selected muse be installed in WordPress and configured correctly as follows.
* **Show icon in sidebar**: Show WordPress logo in sidebar so you could click it
  to show a `Publish` pane in right side of application.

## How to config WordPress REST plugins

### WordPress REST API Authentication by miniOrange

In the plugin settings page, select `BASIC AUTHENTICATION`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-1.png)

In the next page, select `Username & Password with Base64 Encoding` then `Next`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-2.png)

Finally, click `Finish`.

![miniOrange](/obsidian-wordpress/assets/images/wp-miniOrange-3.png)
