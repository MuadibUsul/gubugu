package com.gubugu.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * 安卓返回手势 / 返回键的原生处理。
 *
 * 现象：从屏幕左缘右滑（手势导航的「返回」）或按返回键时，Capacitor 默认直接结束
 * Activity——用户以为是返回上一页，结果整个 App 闪退出去。
 *
 * 处理：注册一个优先级最高的 OnBackPressedCallback（在 super.onCreate 之后添加，
 * 比 Capacitor 自带的回调更晚注册、更先被调用）。用 WebView 自己的历史：
 *   · 能返回（canGoBack，含 Next 客户端 pushState 记录）→ webView.goBack()，回上一页；
 *   · 已到栈底 → moveTaskToBack(true) 把 App 收到后台，跟系统里其它 App 一样，
 *     而不是 finish() 杀掉进程。
 * 放在原生层而非 JS，避免依赖页面水合 / Capacitor backButton 监听的注册时机——更可靠。
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                // WebView.canGoBack() 在本壳里不可靠（实测会在明明有历史时返回 false），
                // 改用后退-前进列表的当前索引判断：index>0 就说明后面还有上一页。
                boolean hasBack = webView != null
                    && (webView.canGoBack() || webView.copyBackForwardList().getCurrentIndex() > 0);
                if (hasBack) {
                    webView.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }
}
