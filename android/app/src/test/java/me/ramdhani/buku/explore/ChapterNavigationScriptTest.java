package me.ramdhani.buku.explore;

import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ChapterNavigationScriptTest {
    @Test
    public void sourceDetectsNextPageOnlyInsidePaginationContext() {
        String source = ChapterNavigationScript.source();

        assertTrue(source.contains("function paginationLikeContext(anchor)"));
        assertTrue(source.contains("function paginationLabelMatchesDirection(anchor,direction)"));
        assertTrue(source.contains("return /\\bnext\\s+page\\b/.test(label);"));
        assertTrue(
            source.contains(
                "return paginationLikeContext(anchor)&&paginationLabelMatchesDirection(anchor,direction);"
            )
        );
    }

    @Test
    public void sourceChecksExplicitChapterLabelsBeforePaginationLabels() {
        String source = ChapterNavigationScript.source();

        assertTrue(
            source.indexOf("var clearLabelAnchors=anchors.filter") <
            source.indexOf("var paginationLabelAnchors=anchors.filter")
        );
        assertTrue(
            source.indexOf("var paginationLabelAnchors=anchors.filter") <
            source.indexOf("var bareLabelAnchors=anchors.filter")
        );
    }

    @Test
    public void sourceKeepsBareNextScopedToNavigationContext() {
        String source = ChapterNavigationScript.source();

        assertTrue(
            source.contains(
                "return /\\bnext\\s+chapter\\b/.test(label)||(allowBare&&label==='next');"
            )
        );
        assertTrue(
            source.contains(
                "return navLikeContext(anchor)&&labelMatchesDirection(anchor,direction,true);"
            )
        );
    }
}
