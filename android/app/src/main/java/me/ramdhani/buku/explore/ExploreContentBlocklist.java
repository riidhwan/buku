package me.ramdhani.buku.explore;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

final class ExploreContentBlocklist {
    private final Set<String> blockedHostSuffixes;
    private final List<String> blockedUrlSubstrings;

    ExploreContentBlocklist(List<String> blockedHostSuffixes, List<String> blockedUrlSubstrings) {
        this.blockedHostSuffixes = normalizedHostSuffixes(blockedHostSuffixes);
        this.blockedUrlSubstrings = normalizedSubstrings(blockedUrlSubstrings);
    }

    boolean blocksHost(String host) {
        if (host == null) {
            return false;
        }

        String normalizedHost = normalize(host);
        for (String suffix : blockedHostSuffixes) {
            if (normalizedHost.equals(suffix) || normalizedHost.endsWith("." + suffix)) {
                return true;
            }
        }

        return false;
    }

    boolean blocksUrl(String url) {
        if (url == null) {
            return false;
        }

        String normalizedUrl = normalize(url);
        for (String substring : blockedUrlSubstrings) {
            if (normalizedUrl.contains(substring)) {
                return true;
            }
        }

        return false;
    }

    private static Set<String> normalizedHostSuffixes(List<String> lines) {
        Set<String> suffixes = new HashSet<>();
        for (String line : lines) {
            String normalized = normalizeRuleLine(line);
            if (normalized.length() > 0) {
                suffixes.add(normalized);
            }
        }

        return suffixes;
    }

    private static List<String> normalizedSubstrings(List<String> lines) {
        List<String> substrings = new ArrayList<>();
        for (String line : lines) {
            String normalized = normalizeRuleLine(line);
            if (normalized.length() > 0) {
                substrings.add(normalized);
            }
        }

        return substrings;
    }

    private static String normalizeRuleLine(String line) {
        String normalized = normalize(line);
        if (normalized.length() == 0 || normalized.startsWith("#")) {
            return "";
        }

        return normalized;
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
