# 收藏卡片镭射效果

来源：[simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css)，GPL-3.0。
许可证副本见 `LICENSES/pokemon-cards-css.txt`。

2026-09-08：将 `public/css/cards/regular-holo.css` 的彩虹渐变、扫描线混合与
`public/css/cards/base.css` 的径向反光适配为 CSS Module。降低叠层强度，按既有
`frameForRarity` 五档评分调整效果；保留原有相框和完整藏品图片。没有引入 Svelte
运行时、宝可梦图片或第三方纹理资源。

`HoloCollectible` 是唯一新增的客户端边界，接收服务端渲染的图片内容。
鼠标在固定外框内移动时，按动画帧更新倾斜和光源；移出、取消、窗口失焦时复位，
卸载时取消待执行帧。触屏和减少动态效果模式只展示静态镭射，不拦截滚动或链接。

入口：我的谷柜中已拥有且已点亮的 SKU；启用相框的公开收藏展示。
想要、交换、未点亮与未鉴定条目沿用原有样式。收藏权限、状态和数据模型不变。

派生的 CSS 保留 GPL-3.0 来源声明；分发包含此代码的产品时需遵守该许可证。
