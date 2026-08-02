# Buku

Buku is an Android-first app for managing and discovering books.

## Manual Chapter Navigation CSS Selectors

Manual Chapter Navigation Rules let Reading Mode use your chosen previous or
next chapter link when automatic detection is not enough. Create one from the
Explore Browser by long-pressing the source-page link you want Buku to use, then
preview the selector before saving.

The selector runs against the live source page, not the simplified Reading Mode
HTML. It must resolve to visible links only; hidden links and non-link elements
are ignored.

### Selector Modes

Use **Link** mode when your selector directly matches the chapter link:

```css
a.next[href]
a[rel~='next']
a.chapter-link[href$='/chapter-12']
nav.pagination a[aria-label='Next chapter']
```

Use **Container** mode when the stable identifier is on a parent element and the
chapter link inside it is less specific:

```css
nav.pagination
div.chapter-navigation
section[role='navigation']
#reader-nav
```

In Container mode, Buku finds visible `a[href]` links inside the matched
container. This is useful when a page has broad links like "Next" and "Previous"
inside a clearly named navigation block.

### Writing a Good Selector

Start from the selector candidates shown in the rule editor, then preview the
matches. If a selector matches multiple visible links, Buku uses the first match
in source-page order.

Prefer stable attributes over layout-dependent structure:

```css
a[rel~='next']
a[aria-label='Next chapter']
a.next-chapter[href]
nav.chapter-nav a[href]
```

Use the selected link's nearby ancestor context when the link itself is generic:

```css
nav[aria-label='Chapter navigation'] a.next[href]
.chapter-footer a[rel~='prev']
#work-navigation a[href$='/previous']
```

Avoid selectors that are likely to match site chrome, comments, ads, or every
link on the page:

```css
a[href]
main a
.button
li:last-child a
```

Use `href` suffix selectors when chapter URLs have a predictable ending:

```css
a[href$='/chapter-10']
a[href$='?chapter=10']
```

Do not make the selector exact-page-specific unless the same pattern will work
on adjacent chapters. A rule for chapter 10 should still identify chapter 11's
"Next" link after navigation.

### Preview And Multiple Matches

Before saving, use preview. The first preview match is the target Buku will use.
Multiple matches are valid, which handles pages that render the same Previous or
Next navigation at both the top and bottom of the chapter. If the first preview
match is not the link you want, narrow the selector with a parent context or a
more specific attribute.

Manual rules override automatic Chapter Navigation only when they validate. If a
saved selector stops matching later, Reading Mode quietly falls back to automatic
detection for that direction.

Manual selectors support CSS selectors only. They do not support XPath,
JavaScript, or script-like expressions.
