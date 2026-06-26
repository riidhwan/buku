package me.ramdhani.buku;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import me.ramdhani.buku.explore.ExploreBrowserPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExploreBrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
