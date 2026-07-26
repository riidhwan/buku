package me.ramdhani.buku.explore;

import android.content.Context;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class ExploreContentBlocklistLoader {
    private static final String BLOCKED_HOSTS_ASSET = "explore-content-blocked-hosts.txt";
    private static final String BLOCKED_URL_SUBSTRINGS_ASSET = "explore-content-blocked-url-substrings.txt";

    ExploreContentBlocklist load(Context context) throws IOException {
        return new ExploreContentBlocklist(
            readLines(context, BLOCKED_HOSTS_ASSET),
            readLines(context, BLOCKED_URL_SUBSTRINGS_ASSET)
        );
    }

    private List<String> readLines(Context context, String assetPath) throws IOException {
        List<String> lines = new ArrayList<>();
        try (
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(context.getAssets().open(assetPath), StandardCharsets.UTF_8)
            )
        ) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        }

        return lines;
    }
}
