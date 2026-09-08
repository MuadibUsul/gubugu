import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor 安卓壳：WebView 加载运行中的 Next 站点（本应用是 SSR/RSC，无法静态导出打包）。
// 已切到云端生产域名：HTTPS 是安全上下文，相机（getUserMedia）可用；手机直连公网，
// 不再需要 USB + adb reverse + 本地 dev。我改完推 main 即自动部署到该域名。
// 本地联调仍可临时把 server.url 改回 http://localhost:3000（配 adb reverse），别提交。
const PROD_URL = 'https://gubugu.tlines.tech';

const config: CapacitorConfig = {
  appId: 'com.gubugu.app',
  appName: '谷布谷',
  webDir: 'capacitor-shell',
  server: {
    url: PROD_URL,
  },
};

export default config;
