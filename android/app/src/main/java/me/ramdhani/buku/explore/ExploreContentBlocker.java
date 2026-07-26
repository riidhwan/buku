package me.ramdhani.buku.explore;

import java.net.URI;
import java.net.URISyntaxException;

final class ExploreContentBlocker {
    private final ExploreContentBlocklist blocklist;

    ExploreContentBlocker(ExploreContentBlocklist blocklist) {
        this.blocklist = blocklist;
    }

    boolean shouldBlock(boolean isForMainFrame, String url) {
        if (isForMainFrame) {
            return false;
        }

        URI uri = parseUrl(url);
        if (uri == null || !isHttpUrl(uri)) {
            return false;
        }

        return blocklist.blocksHost(uri.getHost()) || blocklist.blocksUrl(url);
    }

    private URI parseUrl(String url) {
        if (url == null) {
            return null;
        }

        try {
            return new URI(url);
        } catch (URISyntaxException error) {
            return null;
        }
    }

    private boolean isHttpUrl(URI uri) {
        String scheme = uri.getScheme();
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }
}
