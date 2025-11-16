# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0](https://github.com/bugparty/obsidian-wordpress/compare/v1.0.0...v1.1.0) (2025-05-09)

### [1.0.2](https://github.com/bugparty/obsidian-wordpress/compare/v1.0.0...v1.0.2) (2025-05-09)

## [0.18.0](https://github.com/devbean/obsidian-wordpress/compare/0.17.0...0.18.0) (2023-12-20)


### Features

* Now you can publish private or scheduled posts. ([7a19a5f](https://github.com/devbean/obsidian-wordpress/commit/7a19a5f9abe5bdc5da8a90dfb7128cd8e448f19a))

## [0.17.0](https://github.com/devbean/obsidian-wordpress/compare/0.16.0...0.17.0) (2023-12-18)


### Features

* Obsidian comments could be ignored or convert to HTML comments. ([296e1e0](https://github.com/devbean/obsidian-wordpress/commit/296e1e0cf422e101ab87d4bf8312187468832552))


### Bug Fixes

* Image src is not correct if replace media links is disabled. ([60cf917](https://github.com/devbean/obsidian-wordpress/commit/60cf9173220d45ae37f6c80c1c40e32dcd1470fa))
* No back button for modals on some mobile. ([98258bc](https://github.com/devbean/obsidian-wordpress/commit/98258bc1b707650e121cd6f0b3367d7d268741f8))

## [0.16.0](https://github.com/devbean/obsidian-wordpress/compare/0.15.0...0.16.0) (2023-12-08)

__For wordpress.com users, in order to fetch types, the new scope `sites` is needed,
thus wordpress.com token should be refreshed before publishing.__

### Features

* Fetch post types from API. ([f952965](https://github.com/devbean/obsidian-wordpress/commit/f952965d70794a2aa431292e0f3a7a7ad4bf5c9e))
* Now you could select post type when publishing. ([dfb4b11](https://github.com/devbean/obsidian-wordpress/commit/dfb4b11e506da66e70d50c4bdaa8c2b3289b84ce))

## [0.15.0](https://github.com/devbean/obsidian-wordpress/compare/0.14.0...0.15.0) (2023-10-11)


### Features

* Images in notes will be uploaded to WordPress. ([32e2a7c](https://github.com/devbean/obsidian-wordpress/commit/32e2a7ce4968a12d8e8c237c9d666cdc62043142))


### Bug Fixes

* XML-RPC path maybe undefined sometime. ([6699eef](https://github.com/devbean/obsidian-wordpress/commit/6699eefe9134910f324654141a2aa3a256a02800))

## [0.14.0](https://github.com/devbean/obsidian-wordpress/compare/0.13.4...0.14.0) (2023-04-17)


### Features

* You can parse HTML tags in notes. ([5c23ed4](https://github.com/devbean/obsidian-wordpress/commit/5c23ed47190366ec183a75a6d0d8588bf73765a5))

### [0.13.4](https://github.com/devbean/obsidian-wordpress/compare/0.13.3...0.13.4) (2023-04-12)


### Bug Fixes

* Do not create an empty default profile at startup. ([e59acce](https://github.com/devbean/obsidian-wordpress/commit/e59accef7a45114481d2d009c4b3a20dac534c13))
* No publish button when newly install. ([409d752](https://github.com/devbean/obsidian-wordpress/commit/409d752bf6a0316cb31f90a1ae9c3da1cd2b394d))

### [0.13.3](https://github.com/devbean/obsidian-wordpress/compare/0.13.2...0.13.3) (2023-04-11)


### Features

* Confirms if posts' profile is not match picked. ([ed4d423](https://github.com/devbean/obsidian-wordpress/commit/ed4d4231f8db1935c516b8b0e254d6e29b8d5af7))


### Bug Fixes

* Incorrect response parser of wordpress.com. ([f7c6185](https://github.com/devbean/obsidian-wordpress/commit/f7c61852ea2171e304a29f08e9537b95e3965ee4))

### [0.13.2](https://github.com/devbean/obsidian-wordpress/compare/0.13.1...0.13.2) (2023-04-10)


### Features

* Ignore chooser modal if there is only one profile. ([bfdfd42](https://github.com/devbean/obsidian-wordpress/commit/bfdfd42925bae5f16f9c1026f1a5cc37c52fd16c))


### Bug Fixes

* XML-RPC parse bugs. ([15e2d15](https://github.com/devbean/obsidian-wordpress/commit/15e2d15c2f90c43b8bdba7d1cbacd79130d1dcaa))

### [0.13.1](https://github.com/devbean/obsidian-wordpress/compare/0.13.0...0.13.1) (2023-04-10)

## [0.13.0](https://github.com/devbean/obsidian-wordpress/compare/0.12.0...0.13.0) (2023-04-06)


### Features

* Use markdown-it instead of marked to parse markdown notes. ([4df846a](https://github.com/devbean/obsidian-wordpress/commit/4df846ae792582a024d5ec01689468fd7c4cfcf9))

## [0.12.0](https://github.com/devbean/obsidian-wordpress/compare/0.11.0...0.12.0) (2023-04-04)


### Features

* Do not save password in plaintext. ([7d391b0](https://github.com/devbean/obsidian-wordpress/commit/7d391b0e8df28ddaa72abd4c9fe60069af2598df))
* You can add multiple profiles of WordPress. ([af74d11](https://github.com/devbean/obsidian-wordpress/commit/af74d11bc06e21c2fb6f2c714813b3fb6acd2fb2))


### Bug Fixes

* Skip front-matter null values. Close [#34](https://github.com/devbean/obsidian-wordpress/issues/34) ([b55c76d](https://github.com/devbean/obsidian-wordpress/commit/b55c76db4642a701cfc5ab0b3cc1e8f1276e4059))

## [0.11.0](https://github.com/devbean/obsidian-wordpress/compare/0.10.2...0.11.0) (2023-02-22)


### Features

* Add options about MathJax output format. ([15fb5bc](https://github.com/devbean/obsidian-wordpress/commit/15fb5bcafa5b7a77ff9b43a2a18d52817eff699a))
* Support MathJax. ([e9d61bf](https://github.com/devbean/obsidian-wordpress/commit/e9d61bfee289eb3bbce9e7aca7d6c17e71becf62))

### [0.10.2](https://github.com/devbean/obsidian-wordpress/compare/0.10.1...0.10.2) (2023-02-09)


### Features

* Remember last selected categories of this WordPress site. ([caad134](https://github.com/devbean/obsidian-wordpress/commit/caad13403aace506850a28e05d7f4d37e5ee124c))

### [0.10.1](https://github.com/devbean/obsidian-wordpress/compare/0.10.0...0.10.1) (2023-02-09)


### Features

* Add an option to enable WordPress edit confirm modal. ([716ac1f](https://github.com/devbean/obsidian-wordpress/commit/716ac1f359c87994276639e5c0ad30e498834ad6))


### Bug Fixes

* Publish to uncategorized with default options. ([3ee1a9c](https://github.com/devbean/obsidian-wordpress/commit/3ee1a9cc93ea4e43b89c07d010f8b55b43c2ca8f))

## [0.10.0](https://github.com/devbean/obsidian-wordpress/compare/0.9.1...0.10.0) (2023-02-09)


### Features

* A modal will be opened when published successfully in order to let you edit post in browser. ([5400fc9](https://github.com/devbean/obsidian-wordpress/commit/5400fc974a0a1f125abcf0a972f4efce68f27a6c))
* You can override note title in front matter using `title` field. ([d905f4b](https://github.com/devbean/obsidian-wordpress/commit/d905f4ba5d47f6009ba728367dcbf11a8c05803d))


### Bug Fixes

* Post ID is not written to front matter if publishing with default options. ([90bfea8](https://github.com/devbean/obsidian-wordpress/commit/90bfea828946f214461427470e5684e3f6a38aba))

### [0.9.1](https://github.com/devbean/obsidian-wordpress/compare/0.9.0...0.9.1) (2023-02-07)


### Bug Fixes

* Compile errors. ([b37ee81](https://github.com/devbean/obsidian-wordpress/commit/b37ee81a53a5322adb67eafb51cf737a5628a45c))

## [0.9.0](https://github.com/devbean/obsidian-wordpress/compare/0.8.0...0.9.0) (2023-02-07)


### Features

* Supports for editing posts. ([2f153df](https://github.com/devbean/obsidian-wordpress/commit/2f153dfc95cd2bfd97245179e0e981aa276f7d20))
* Supports for tags. ([72a15fc](https://github.com/devbean/obsidian-wordpress/commit/72a15fcb16e7b6246f2da03305c6db52253d228c))

## [0.8.0](https://github.com/devbean/obsidian-wordpress/compare/0.7.0...0.8.0) (2022-12-29)


### Features

* Error notices will be stay in frame until clicking. ([abae9d7](https://github.com/devbean/obsidian-wordpress/commit/abae9d794370847738a93f720aa3ad220c1a2cd8))
* Support for wordpress.com. ([12e96eb](https://github.com/devbean/obsidian-wordpress/commit/12e96ebb1d036f2f9f1a5535b517dd552197dc0c))


### Bug Fixes

* Update ribbon button may cause plugin failed. ([737f981](https://github.com/devbean/obsidian-wordpress/commit/737f981130a37525d2431d0f847b9afdc73b35c5))

## [0.7.0](https://github.com/devbean/obsidian-wordpress/compare/0.6.0...0.7.0) (2022-12-13)


### Features

* Support WordPress application passwords authentication. ([fce8ca8](https://github.com/devbean/obsidian-wordpress/commit/fce8ca8c18345c409a05d56c68a16e9504a5d59f))
* Update license to Apache 2.0 ([abb19c2](https://github.com/devbean/obsidian-wordpress/commit/abb19c2687f12b7639e50727c45643b320d09cf6))
* Update license to Apache 2.0 ([560712b](https://github.com/devbean/obsidian-wordpress/commit/560712b18103059a599276577a175b6cac09be5d))


### Bug Fixes

* Fix a bug about save username and password working. ([90b9281](https://github.com/devbean/obsidian-wordpress/commit/90b9281f53ec62dafee63453a36a86bd55168f90))

## [0.5.0](https://github.com/devbean/obsidian-wordpress/compare/0.4.0...0.5.0) (2022-08-15)

## [0.6.0](https://github.com/devbean/obsidian-wordpress/compare/0.4.0...0.6.0) (2022-12-12)


### Features

* Now you can set comment status when publishing. ([2b69006](https://github.com/devbean/obsidian-wordpress/commit/2b69006033a1543bc6451cb610eb66242dc77afd))
* Support i18n. ([d8560ea](https://github.com/devbean/obsidian-wordpress/commit/d8560ea602f43de59db0565189710fe8645737a0))
* You can remember password on login modal. Be careful! ([4dd257d](https://github.com/devbean/obsidian-wordpress/commit/4dd257d2151d12cc93752d4396ed479b880f3de3))
* You can set XML-RPC path in settings, default is /xmlrpc.php ([b44be7d](https://github.com/devbean/obsidian-wordpress/commit/b44be7db1db3c24286052062a7e05422433a57af))


### Bug Fixes

* Cannot login if username and password are not saved. ([f8d2a5b](https://github.com/devbean/obsidian-wordpress/commit/f8d2a5b4f3e9cc9ce5ddce04133a130faf9f4401))
* Fix date-fns template placeholder error. ([f5b3e32](https://github.com/devbean/obsidian-wordpress/commit/f5b3e32ff56e5ba1904d86703f3973a447c9ca5c))
* Normalize URL. ([b25659b](https://github.com/devbean/obsidian-wordpress/commit/b25659bf5da586d3aa4eb1fcf31f4544616b4acd))
* Remove client cache. ([b6584e7](https://github.com/devbean/obsidian-wordpress/commit/b6584e73892ab6a52915ab00b9a00cab2c5752fd))
* Show notice if no WordPress URL set. ([baf92d7](https://github.com/devbean/obsidian-wordpress/commit/baf92d79e5f2db5f97210db7fa157f9b5ba0d531))
* Show notice if username or password is invalided. ([577f24f](https://github.com/devbean/obsidian-wordpress/commit/577f24f7c885f6d715fd51c9bc563681a528b370))

## [0.5.0](https://github.com/devbean/obsidian-wordpress/compare/0.4.0...0.5.0) (2022-08-15)


### Features

* You can remember password on login modal. Be careful! ([4dd257d](https://github.com/devbean/obsidian-wordpress/commit/4dd257d2151d12cc93752d4396ed479b880f3de3))

## [0.4.0](https://github.com/devbean/obsidian-wordpress/compare/0.3.0...0.4.0) (2022-04-26)


### Features

* Now you can set post category by fetching categories with XML-RPC. ([2393092](https://github.com/devbean/obsidian-wordpress/commit/23930923dd9b626c07cc1b94473da723acbdcb02))
* Now you can set post one category using REST api, too. ([d7c723e](https://github.com/devbean/obsidian-wordpress/commit/d7c723e61e0a6b7838b97ce5fee094434e341dfe))


### Bug Fixes

* Fix 'not well formed' bug if post content is very long using XML-RPC. ([1e8ac85](https://github.com/devbean/obsidian-wordpress/commit/1e8ac854ecfe9f485751d9d10b658ad4002fab95))
* Fix a bug if XML-RPC returns an array with only one item. ([08f53be](https://github.com/devbean/obsidian-wordpress/commit/08f53beeb553cc370fb1d6736b44171d0fb0fafe))

## [0.3.0](https://github.com/devbean/obsidian-wordpress/compare/0.2.0...0.3.0) (2022-04-05)


### Features

* Simplify API types. ([99bd146](https://github.com/devbean/obsidian-wordpress/commit/99bd146cef4eef02faf3b592668e3e17e7e7439b))
* You can set post status now. ([0661893](https://github.com/devbean/obsidian-wordpress/commit/06618936fda714d62240198377a48ea81553f596))

## [0.2.0](https://github.com/devbean/obsidian-wordpress/compare/0.1.1...0.2.0) (2022-03-09)


### Features

* Add REST support. ([f55139a](https://github.com/devbean/obsidian-wordpress/commit/f55139a13477b83f16be51ea20349acb2a484fe0))

### [0.1.1](https://github.com/devbean/obsidian-wordpress/compare/0.1.0...0.1.1) (2022-02-24)


### Features

* Ribbon icon could be refreshed if plugin options updates. ([9620ddd](https://github.com/devbean/obsidian-wordpress/commit/9620ddd48cfe3654e6583d6be2039e821e5a6da6))

## [0.1.0](https://github.com/devbean/obsidian-wordpress/compare/0.0.2...0.1.0) (2022-02-24)


### Features

* Use own XML-RPC implementation in order to support mobile. ([d0cc528](https://github.com/devbean/obsidian-wordpress/commit/d0cc5280d64ee2eded8c124205ef4cf9df9d60dd))

### [0.0.2](https://github.com/devbean/obsidian-wordpress/compare/0.0.1...0.0.2) (2021-12-22)


### Features

* Use async reading file content instead of sync. ([16036b9](https://github.com/devbean/obsidian-wordpress/commit/16036b9374738c984fc5e6db15e2f8caeec93ce8))

### 0.0.1 (2021-12-09)
