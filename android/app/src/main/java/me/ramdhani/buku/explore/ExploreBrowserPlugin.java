package me.ramdhani.buku.explore;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

@CapacitorPlugin(name = "ExploreBrowser")
public class ExploreBrowserPlugin extends Plugin {
    private static final String HTTP_SCHEME = "http";
    private static final String HTTPS_SCHEME = "https";

    private WebView webView;
    private String currentUrl;
    private boolean loading;

    @PluginMethod
    public void show(PluginCall call) {
        JSObject rect = call.getObject("rect");
        if (rect == null) {
            call.reject("Missing viewport rectangle.");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            WebView browser = ensureWebView(activity);
            FrameLayout.LayoutParams layoutParams = toLayoutParams(activity, rect);
            if (browser.getParent() == null) {
                activity.addContentView(browser, layoutParams);
            } else {
                browser.setLayoutParams(layoutParams);
            }
            browser.setVisibility(View.VISIBLE);
            call.resolve();
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView != null) {
                webView.setVisibility(View.GONE);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void destroy(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            destroyWebView();
            call.resolve();
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        String url = call.getString("url");
        if (!isHttpUrl(url)) {
            call.reject("Only HTTP and HTTPS URLs are supported.");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            ensureWebView(activity).loadUrl(url);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView != null) {
                webView.stopLoading();
                loading = false;
                emitNavigationState(false);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void reload(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView != null) {
                webView.reload();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void back(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void forward(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView != null && webView.canGoForward()) {
                webView.goForward();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void copyUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("Missing URL.");
            return;
        }

        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("Explore Browser URL", url));
        call.resolve();
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (!isHttpUrl(url)) {
            call.reject("Only HTTP and HTTPS URLs are supported.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        if (intent.resolveActivity(getContext().getPackageManager()) == null) {
            call.reject("No external browser is available.");
            return;
        }

        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void extractArticle(PluginCall call) {
        String readabilityScript = call.getString("readabilityScript");
        if (readabilityScript == null || readabilityScript.length() == 0) {
            call.reject("Missing Readability runner.");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (webView == null) {
                call.resolve(articleStatus("failed", "Explore Browser is not open."));
                return;
            }

            webView.evaluateJavascript(articleExtractionScript(readabilityScript), result -> {
                try {
                    call.resolve(toArticleExtractionPayload(result));
                } catch (JSONException error) {
                    call.resolve(articleStatus("failed", "Article extraction returned invalid data."));
                }
            });
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView ensureWebView(Activity activity) {
        if (webView != null) {
            return webView;
        }

        WebView browser = new WebView(activity);
        browser.setBackgroundColor(0xffffffff);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, true);

        browser.setDownloadListener(downloadListener);
        browser.setWebViewClient(new ExploreWebViewClient());
        browser.setWebChromeClient(new ExploreWebChromeClient());
        webView = browser;
        return browser;
    }

    private final DownloadListener downloadListener = (url, userAgent, contentDisposition, mimeType, contentLength) -> {
        notifyCapabilityUnsupported("download", url);
    };

    private FrameLayout.LayoutParams toLayoutParams(Activity activity, JSObject rect) {
        float density = activity.getResources().getDisplayMetrics().density;
        int left = Math.round((float) rect.optDouble("left", 0d) * density);
        int top = Math.round((float) rect.optDouble("top", 0d) * density);
        int width = Math.round((float) rect.optDouble("width", 0d) * density);
        int height = Math.round((float) rect.optDouble("height", 0d) * density);

        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(width, height);
        layoutParams.leftMargin = left;
        layoutParams.topMargin = top;
        return layoutParams;
    }

    private void destroyWebView() {
        if (webView == null) {
            return;
        }

        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent != null) {
            parent.removeView(webView);
        }
        webView.destroy();
        webView = null;
        currentUrl = null;
        loading = false;
    }

    private void emitNavigationState(boolean committed) {
        if (webView == null || currentUrl == null) {
            return;
        }

        JSObject payload = new JSObject();
        payload.put("url", currentUrl);
        payload.put("loading", loading);
        payload.put("canGoBack", webView.canGoBack());
        payload.put("canGoForward", webView.canGoForward());
        payload.put("committed", committed);
        notifyListeners("navigationState", payload);
    }

    private void notifyLoadFailed(String url, String description) {
        JSObject payload = new JSObject();
        payload.put("url", url);
        payload.put("description", description);
        notifyListeners("loadFailed", payload);
    }

    private void notifyCapabilityUnsupported(String capability, String url) {
        JSObject payload = new JSObject();
        payload.put("capability", capability);
        payload.put("url", url);
        notifyListeners("capabilityUnsupported", payload);
    }

    private String articleExtractionScript(String readabilityScript) {
        return "(function(){try{" +
            readabilityScript +
            ";" + chapterNavigationExtractionScript() +
            "var previousChapter=findChapterLink('previous');" +
            "var nextChapter=findChapterLink('next');" +
            ";var clonedDocument=document.cloneNode(true);" +
            "var article=new Readability(clonedDocument).parse();" +
            "if(!article||!article.content||!article.textContent||!article.textContent.trim()){" +
            "return JSON.stringify({status:'unavailable'});" +
            "}" +
            "var snapshot={" +
            "url:document.location.href," +
            "title:article.title||document.title||document.location.href," +
            "byline:article.byline||null," +
            "siteName:article.siteName||null," +
            "excerpt:article.excerpt||null," +
            "publishedTime:article.publishedTime||null," +
            "contentHtml:article.content||''," +
            "textContent:article.textContent||''," +
            "length:article.length||((article.textContent||'').length)" +
            "};" +
            "if(previousChapter){snapshot.previousChapter=previousChapter;}" +
            "if(nextChapter){snapshot.nextChapter=nextChapter;}" +
            "return JSON.stringify({status:'ok',article:snapshot});" +
            "}catch(error){" +
            "return JSON.stringify({status:'failed',message:error&&error.message?error.message:'Article extraction failed.'});" +
            "}})();";
    }

    private String chapterNavigationExtractionScript() {
        return "function cleanChapterText(value){" +
            "return (value||'').replace(/\\s+/g,' ').trim();" +
            "}" +
            "function hasRel(element,direction){" +
            "var rel=(element.getAttribute('rel')||'').toLowerCase().split(/\\s+/);" +
            "return rel.indexOf(direction==='previous'?'prev':'next')!==-1;" +
            "}" +
            "function isVisibleChapterAnchor(anchor){" +
            "var style=window.getComputedStyle(anchor);" +
            "return style.display!=='none'&&style.visibility!=='hidden'&&anchor.getClientRects().length>0;" +
            "}" +
            "function navLikeContext(anchor){" +
            "var context=anchor.closest('nav,[role=\"navigation\"]," +
            ".nav,.navigation,.pager,.pagination,.chapter-nav,.chapter-navigation," +
            ".post-navigation,.entry-navigation,.page-links');" +
            "if(context){return true;}" +
            "var value='';" +
            "var current=anchor;" +
            "for(var depth=0;current&&depth<3;depth+=1,current=current.parentElement){" +
            "value+=' '+(current.id||'')+' '+(current.className||'');" +
            "}" +
            "return /\\b(nav|pager|pagination|chapter|prev|previous|next)\\b/i.test(value);" +
            "}" +
            "function toChapterLink(element){" +
            "var href=element&&element.getAttribute('href');" +
            "if(!href){return null;}" +
            "try{" +
            "var absolute=new URL(href,document.location.href);" +
            "if(absolute.protocol!=='http:'&&absolute.protocol!=='https:'){return null;}" +
            "var current=new URL(document.location.href);" +
            "current.hash='';absolute.hash='';" +
            "if(absolute.toString()===current.toString()){return null;}" +
            "}catch(error){return null;}" +
            "var label=cleanChapterText(element.getAttribute('title')||" +
            "element.getAttribute('aria-label')||element.textContent||'');" +
            "return {href:href,label:label||null};" +
            "}" +
            "function uniqueChapterCandidate(elements){" +
            "var candidate=null;" +
            "var absoluteHref=null;" +
            "for(var index=0;index<elements.length;index+=1){" +
            "var link=toChapterLink(elements[index]);" +
            "if(!link){continue;}" +
            "var absolute=new URL(link.href,document.location.href).toString();" +
            "if(absoluteHref!==null&&absoluteHref!==absolute){return null;}" +
            "absoluteHref=absolute;candidate=link;" +
            "}" +
            "return candidate;" +
            "}" +
            "function labelMatchesDirection(anchor,direction,allowBare){" +
            "var label=cleanChapterText(anchor.getAttribute('aria-label')||" +
            "anchor.getAttribute('title')||anchor.textContent||'').toLowerCase();" +
            "if(direction==='previous'){" +
            "return /\\b(prev|previous)\\s+chapter\\b/.test(label)||" +
            "(allowBare&&/^(prev|previous)$/.test(label));" +
            "}" +
            "return /\\bnext\\s+chapter\\b/.test(label)||(allowBare&&label==='next');" +
            "}" +
            "function visibleAnchors(){" +
            "return Array.prototype.slice.call(document.querySelectorAll('a[href]'))" +
            ".filter(isVisibleChapterAnchor);" +
            "}" +
            "function findChapterLink(direction){" +
            "var relLinks=Array.prototype.slice.call(document.querySelectorAll('link[href][rel]'))" +
            ".filter(function(element){return hasRel(element,direction);});" +
            "if(relLinks.length>0){return uniqueChapterCandidate(relLinks);}" +
            "var anchors=visibleAnchors();" +
            "var relAnchors=anchors.filter(function(anchor){return hasRel(anchor,direction);});" +
            "if(relAnchors.length>0){return uniqueChapterCandidate(relAnchors);}" +
            "var clearLabelAnchors=anchors.filter(function(anchor){" +
            "return labelMatchesDirection(anchor,direction,false);" +
            "});" +
            "if(clearLabelAnchors.length>0){return uniqueChapterCandidate(clearLabelAnchors);}" +
            "var bareLabelAnchors=anchors.filter(function(anchor){" +
            "return navLikeContext(anchor)&&labelMatchesDirection(anchor,direction,true);" +
            "});" +
            "return uniqueChapterCandidate(bareLabelAnchors);" +
            "}";
    }

    private JSObject toArticleExtractionPayload(String result) throws JSONException {
        Object decodedResult = new JSONTokener(result).nextValue();
        if (!(decodedResult instanceof String)) {
            return articleStatus("failed", "Article extraction returned invalid data.");
        }

        Object decodedPayload = new JSONTokener((String) decodedResult).nextValue();
        if (!(decodedPayload instanceof JSONObject)) {
            return articleStatus("failed", "Article extraction returned invalid data.");
        }

        return JSObject.fromJSONObject((JSONObject) decodedPayload);
    }

    private JSObject articleStatus(String status, String message) {
        JSObject payload = new JSObject();
        payload.put("status", status);
        payload.put("message", message);
        return payload;
    }

    private boolean isHttpUrl(String url) {
        if (url == null) {
            return false;
        }

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        return HTTP_SCHEME.equals(scheme) || HTTPS_SCHEME.equals(scheme);
    }

    private boolean shouldBlockUnsupported(Uri uri) {
        String scheme = uri.getScheme();
        return scheme != null && !HTTP_SCHEME.equals(scheme) && !HTTPS_SCHEME.equals(scheme);
    }

    private final class ExploreWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            currentUrl = url;
            loading = true;
            emitNavigationState(false);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            currentUrl = url;
            loading = false;
            emitNavigationState(true);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (shouldBlockUnsupported(uri)) {
                notifyCapabilityUnsupported("customScheme", uri.toString());
                return true;
            }

            return false;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) {
                return;
            }

            loading = false;
            notifyLoadFailed(request.getUrl().toString(), error.getDescription().toString());
            emitNavigationState(false);
        }
    }

    private final class ExploreWebChromeClient extends WebChromeClient {
        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            notifyCapabilityUnsupported("newWindow", currentUrl);
            WebView newWindow = new WebView(view.getContext());
            newWindow.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView ignoredView, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (shouldBlockUnsupported(uri)) {
                        notifyCapabilityUnsupported("customScheme", uri.toString());
                    } else if (webView != null) {
                        webView.loadUrl(uri.toString());
                    }
                    return true;
                }
            });

            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(newWindow);
            resultMsg.sendToTarget();
            return true;
        }

        @Override
        public boolean onShowFileChooser(
            WebView webView,
            ValueCallback<Uri[]> filePathCallback,
            FileChooserParams fileChooserParams
        ) {
            notifyCapabilityUnsupported("fileUpload", currentUrl);
            filePathCallback.onReceiveValue(null);
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            String capability = requestedCapability(request.getResources());
            notifyCapabilityUnsupported(capability, request.getOrigin().toString());
            request.deny();
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            notifyCapabilityUnsupported("geolocation", origin);
            callback.invoke(origin, false, false);
        }
    }

    private String requestedCapability(String[] resources) {
        for (String resource : resources) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                return "camera";
            }
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                return "microphone";
            }
        }

        return "unknown";
    }
}
