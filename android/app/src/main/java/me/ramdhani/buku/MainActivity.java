package me.ramdhani.buku;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import me.ramdhani.buku.explore.ExploreBrowserPlugin;
import me.ramdhani.buku.update.AppUpdatePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExploreBrowserPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
