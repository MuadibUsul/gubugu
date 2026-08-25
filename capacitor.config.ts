import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor 安卓壳：WebView 加载运行中的 Next 站点（本应用是 SSR/RSC，无法静态导出打包）。
// 相机（getUserMedia）要求安全上下文——localhost 算安全，局域网 http 不算。所以 USB 调试期
// 用 `adb reverse tcp:3000 tcp:3000` 把手机 localhost 转发到电脑 dev，再指向 localhost。
// 上架前把 server.url 换成部署好的 HTTPS 域名（也是安全上下文，相机同样可用），并去掉 cleartext。
const DEV_URL = 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.gubugu.app',
  appName: '谷布谷',
  webDir: 'capacitor-shell',
  server: {
    url: DEV_URL,
    cleartext: true,
  },
  android: {
    // 允许 http（仅 dev 局域网）。生产用 HTTPS 时删掉上面的 cleartext。
    allowMixedContent: true,
  },
};

export default config;
