## Obsidian WordPress Plugin

This an obsidian plugin for publishing documents to WordPress CMS.

## How to install

The plugin could be installed in `Community plugins`
by searching `wordpress` as keyword.

![Installing](/obsidian-wordpress/assets/images/01GX5KHAK2BSM1CQKT19D6B2AX.png)

## How to use

Before publishing, necessary WordPress settings should be done
in `WordPress` tab of Settings.

![Settings](/obsidian-wordpress/assets/images/01GX5KHAK2S10XJRZE6CMBSGJB.png)

You can find settings as following:

Let's say a WordPress server could be access by https://www.mywp.com .

* **Profiles**: WordPress profiles. You could add multiple WordPress profiles
  in order to publish notes to multiple WordPress servers.
* **Show icon in sidebar**: Show WordPress button in sidebar so you could click it
  to publish current note without opening command palette.
* **Default Post Status**: Default post status when publishing.
* **Default Post Comment Status**: Default comment status when publishing.
* **Remember last selected categories**: Turn it on if you want to remember
  last selected categories when publishing.
* **Show WordPress edit confirmation**: Turn it on if you want to open
  WordPress editing page after publishing successfully.
* **MathJax Output Format**: Output format of MathJax.
  * SVG: An image format that supports by browser so there is no need configure
    for WordPress. But if you try to edit using WordPress editor, SVG images
    will be lost for WordPress editor does not support SVG.
  * TeX: A WordPress plugin, such as [Simple Mathjax](https://wordpress.org/plugins/simple-mathjax/),
    is needed for rendering but you can edit using WordPress editor.

While WordPress profiles could be managed in another modal.

![Profiles](/obsidian-wordpress/assets/images/01GX5KHAK2G1CQQKKY37RA4KMY.png)

Creates or edits a profile needs such information:

![Profile](/obsidian-wordpress/assets/images/01GX5KHAK22NWQ6CPWEBR1GG11.png)

Some need be explained.

* **Name**: Name of this profile.
* **WordPress URL**: A full path of WordPress.
  It should be https://www.mywp.com. Note that if your site does not support
  URL rewrite, you may add `/index.php` appending to your domain.
* **API Type**: At this version we support following API types:
  * XML-RPC: Enabled by default but some hosts may disable it for safety problems.
  * REST API Authentication by miniOrange: REST API is enabled by default since WordPress 4.7.
    An extra plugin named miniOrange is needed to be installed and enabled in order to
    protect core writable APIs.
  * REST API Authentication by application password: REST API is enabled by default
    since WordPress 4.7 while application password was introduced in WordPress 5.6.
    If you are OK with WordPress 5.6, this is recommended as no plugin is needed.
  * REST API for wordpress.com only: REST API is enabled by default on wordpress.com.

  **Note** The mentioned plugins miniOrange must be installed and enabled in WordPress server
  and configured correctly as following steps.

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

## Obsidian syntax support

The following Obsidian syntax is converted while publishing:

* **Wikilinks** `[[note]]`, `[[note|alias]]` and `[[note#heading]]`: if the target note
  has been published with the same profile, the link becomes a permalink of the
  published post. Otherwise it is rendered as plain text and a notice is shown.
* **Note embeds** `![[note]]` and `![[note#heading]]`: the embedded note content is
  expanded into the published post (up to 5 levels deep, cyclic embeds are skipped).
* **Callouts** `> [!note] Title`: rendered as `<div class="callout callout-note">`
  with the type icon. Callouts with a fold marker (`-` or `+`) become collapsible
  `<details>`/`<summary>` elements. Style them with CSS on your WordPress site.
* **Task lists** `- [ ]` / `- [x]`: rendered as HTML checkboxes.
* **Highlights** `==text==`: rendered as `<mark>text</mark>`.
* **Footnotes** `[^1]`: rendered as HTML footnotes.
* **Code blocks**: highlighted at publish time with highlight.js
  (common languages bundled). The matching stylesheet is embedded into
  the post, so no WordPress plugin is needed.
* **Mermaid** diagrams: rendered to standalone SVG at publish time and
  embedded in a protected container which prevents WordPress's automatic
  paragraph formatting from damaging the diagram. They display without any WordPress-side
  mermaid plugin. Diagrams which fail to render keep their original
  code fence.
* **Comments** `%%...%%`: single-line and multi-line comment blocks are supported.
* **Math** `$...$` and `$$...$$`: rendered as SVG or TeX depending on the
  MathJax output format setting.

Posts which use callouts, task lists, highlights, footnotes or
highlighted code get a small stylesheet embedded into the post content,
so they look right with any WordPress theme without extra plugins.

## Batch publishing

Use the **Batch publish notes or a folder** command, or select multiple notes in
Obsidian's File Explorer and use the WordPress item in the right-click menu.
The same menu on a folder selects all Markdown notes in that folder, including
subfolders. The batch window also supports searching, checkboxes and folder
selection.

Opening the batch window from the context menu automatically checks the selected
notes. A folder context also selects that folder in the dropdown and checks its
descendant Markdown notes. Checked notes appear first so the initial selection
remains visible even when the vault has more than 200 notes.

Choose one target account and an article status, then click **Preview publish
list**. This read-only scan lists the selected articles, additional referenced
articles and attachments before any uploads or publications occur. Referenced
and embedded Markdown notes are included recursively, even outside the selected
folder, and will be published **in full**. Existing articles on the target account
are updated. Notes associated with another account create new articles on the
selected account and receive new local publishing metadata; these are listed
separately in the confirmation window.

Batch publishing includes references automatically, independently of the
single-note `Auto publish linked notes` setting. Wiki links, note embeds and
ordinary/reference-style Markdown links are supported. Code and comments are
excluded. Images and linked attachments are uploaded automatically, with shared
files using the upload cache. Referenced articles are published before their
parents when possible; cyclic references receive a link update after their
article IDs exist, without duplicate creation.

The confirmed scan uses a snapshot of the note contents. Changes made after the
preview cannot silently add articles to the batch; go back and preview again to
include edits. All articles share the chosen status and use their own frontmatter
for titles, tags and categories, falling back to account defaults. Per-note
publishing and browser-edit dialogs are suppressed. The progress window can stop
remaining tasks; the current article finishes and completed articles/uploads
are kept. Closing the batch window or unloading the plugin also stops subsequent
tasks. A summary lists successful, failed and unexecuted articles, including
any links still needing an update. Attachment upload failures fail the affected
article. Independent articles continue; articles that depend on a failed article
are reported as failed too.

## Linked notes

When the `Auto publish linked notes` setting is enabled (off by default), notes
referenced by wikilinks in the current note which have not been
published yet are published first — with the default publish options,
recursively and cycle-safe. The wikilinks then resolve to the
permalinks of the freshly published notes. Notes which already have a
`postId` in their frontmatter are not published again. Linked notes are only
published after submitting the main note's publish dialog; cancelling the
dialog does not publish them. Links in comments, escaped text and code are ignored.

Heading and block links have corresponding anchors in the generated HTML.
Embedded notes retain their own directory for resolving images and links.
Missing sections, cyclic embeds and embeds beyond the depth limit produce a
warning and a text placeholder; they never expand to the whole note or upload
the original Markdown file as an attachment.

## Media files and attachments

Local images and other media files referenced by a note are uploaded to the
WordPress media library before publishing, and the links are rewritten to the
uploaded URLs. Both Obsidian wiki embeds (`![[image.png]]`,
`![[image.png|300]]`, `![[image.png|some alt]]`) and markdown images
(`![alt](image.png)`) are supported. Media files with paths relative to the
note are resolved correctly. Non-image attachments such as PDFs are uploaded
and linked.

Uploaded media files are remembered separately for each site/account, so publishing the same note again does
not upload the same files again. The cache can be cleared with the
`Clear media upload cache` button in the plugin settings.

**Replace media links**: if enabled, the media links in the note itself are
replaced with the WordPress URLs after uploading. It is disabled by default
since the uploaded files are remembered anyway.

The profile's remember username/password switches control what is saved on
disk. Credentials entered with those switches off remain in memory only.

## Development

Use Node.js 22.12 or later, then run `npm ci`, `npm test` and `npm run build`.
The tests exercise both Markdown conversion and publication regressions with
mocked Obsidian/WordPress interfaces.

For real browser rendering, run `npm run test:browser:build` and open
`test/.out/mermaid-browser-test.html` in a browser. It checks actual Mermaid
SVG generation, re-rendering, syntax-error fallback and timeout cleanup.

## Frontmatter properties

The following note properties are recognized while publishing:

* `title`: overrides the post title.
* `postId`: updates the existing WordPress post with this id.
* `profileName`, `postType`, `categories`, `tags`: same as before.
  Tags could be a list or a comma-separated string.
* `excerpt`: the post excerpt.
* `slug`: the post slug (permalink name).
* `date`: the post date, e.g. `2026-10-02 12:00:00`.

After publishing, the plugin writes back `profileName`, `postId`, `postType`,
`categories` and `postLink` (the permalink of the published post, used for
converting wikilinks from other notes).
