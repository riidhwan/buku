package me.ramdhani.buku.explore;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;

import org.junit.Test;

public class ExploreContentBlockerTest {
    private final ExploreContentBlocker blocker = new ExploreContentBlocker(
        new ExploreContentBlocklist(
            Arrays.asList(
                "# comment",
                "",
                " doubleclick.net ",
                "googlesyndication.com",
                "vdo.ai"
            ),
            Arrays.asList(
                "# comment",
                "",
                "/adsbygoogle",
                "/pagead/"
            )
        )
    );

    @Test
    public void blocksExactListedHostSubresource() {
        assertTrue(blocker.shouldBlock(false, "https://doubleclick.net/script.js"));
    }

    @Test
    public void blocksListedHostSuffixSubresource() {
        assertTrue(blocker.shouldBlock(false, "https://stats.g.doubleclick.net/script.js"));
    }

    @Test
    public void blocksVdoAiHostSuffixSubresource() {
        assertTrue(blocker.shouldBlock(false, "https://delivery.vdo.ai/player.js"));
    }

    @Test
    public void doesNotBlockPartialHostMatch() {
        assertFalse(blocker.shouldBlock(false, "https://notdoubleclick.net/script.js"));
    }

    @Test
    public void blocksListedUrlSubstringSubresource() {
        assertTrue(blocker.shouldBlock(false, "https://cdn.example.com/pagead/script.js"));
    }

    @Test
    public void matchesHttpSchemesCaseInsensitively() {
        assertTrue(blocker.shouldBlock(false, "HTTPS://stats.g.doubleclick.net/script.js"));
    }

    @Test
    public void neverBlocksMainFrameNavigation() {
        assertFalse(blocker.shouldBlock(true, "https://doubleclick.net/pagead/landing.html"));
    }

    @Test
    public void ignoresUnsupportedAndInvalidUrls() {
        assertFalse(blocker.shouldBlock(false, "mailto:reader@example.com"));
        assertFalse(blocker.shouldBlock(false, "not a url"));
    }

    @Test
    public void allowsOrdinaryFirstPartyContent() {
        assertFalse(blocker.shouldBlock(false, "https://reader.example/wp-content/image.jpg"));
    }
}
