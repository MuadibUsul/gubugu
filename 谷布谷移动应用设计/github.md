repo: MuadibUsul/gubugu
branch: main

## Last sync

date: 2026-08-25T17:20:01Z

### Updated in this project

- 读取了仓库的设计 token、UI 指南与关键组件，作为移动端设计的依据
- 建立移动端设计说明（导航结构、术语、状态模型对齐 `user_goods`）

## Screen map

| 项目屏幕 | 仓库来源文件 |
| --- | --- |
| 设计说明 / 全局语言 | docs/ui-guidelines.md, app/globals.css, lib/config/site.ts |
| 首页 | app/page.tsx, components/home/* |
| 谷库搜索 | components/search/*, lib/search-params.ts |
| SKU 详情 / 收藏状态 | components/goods/*, lib/user-goods-status.ts |
| 谷柜 / 完成度 | components/user/user-progress-overview.tsx, user-goods-shelf.tsx |
| 相机识别 | components/recognition/*, lib/recognition.ts |
| 换谷 | components/exchange/*, lib/exchange-listing.ts |
| 底部导航 | components/layout/site-navigation.tsx |
