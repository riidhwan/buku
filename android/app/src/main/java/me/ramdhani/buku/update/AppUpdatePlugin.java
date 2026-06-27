package me.ramdhani.buku.update;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        if (!isValidApkRequest(url, fileName)) {
            call.resolve(status("invalid-apk"));
            return;
        }

        if (!canInstallPackages()) {
            openInstallPermissionSettings();
            call.resolve(status("install-permission-required"));
            return;
        }

        executor.execute(() -> installDownloadedApk(call, url, fileName));
    }

    private void installDownloadedApk(PluginCall call, String url, String fileName) {
        try {
            File apk = downloadApk(url, fileName);
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, APK_MIME_TYPE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                call.resolve(status("installer-unavailable"));
                return;
            }

            getContext().startActivity(intent);
            call.resolve(status("ok"));
        } catch (IOException error) {
            call.resolve(status("download-failed"));
        } catch (ActivityNotFoundException error) {
            call.resolve(status("installer-unavailable"));
        } catch (IllegalArgumentException error) {
            call.resolve(status("invalid-apk"));
        }
    }

    private File downloadApk(String url, String fileName) throws IOException {
        File updateDir = new File(getContext().getCacheDir(), "updates");
        if (!updateDir.exists() && !updateDir.mkdirs()) {
            throw new IOException("Could not create update cache directory.");
        }

        File apk = new File(updateDir, fileName);
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept", APK_MIME_TYPE);

        try {
            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                throw new IOException("APK download failed.");
            }

            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apk)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                }
            }
        } finally {
            connection.disconnect();
        }

        return apk;
    }

    private boolean canInstallPackages() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }

        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        Uri uri = Uri.parse("package:" + getContext().getPackageName());
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (intent.resolveActivity(getContext().getPackageManager()) != null) {
            getContext().startActivity(intent);
        }
    }

    private boolean isValidApkRequest(String url, String fileName) {
        if (url == null || fileName == null || !fileName.endsWith(".apk")) {
            return false;
        }

        String scheme = Uri.parse(url).getScheme();
        return "https".equals(scheme);
    }

    private JSObject status(String status) {
        JSObject payload = new JSObject();
        payload.put("status", status);
        return payload;
    }
}
