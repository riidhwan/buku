# Buku

Buku is an Android-first app for managing and discovering books.

## Language

**Library**:
The user's collection-oriented area for books in Buku.

**Series**:
The top-level Library grouping for saved Reading Mode snapshots. Every Series Entry belongs to exactly one Series, including standalone works.
_Avoid_: collection, folder, book

**Series Entry**:
A persisted Reading Mode snapshot saved inside a Series. Buku treats Series Entries generically even when the source calls them chapters, volumes, parts, or another content unit.
_Avoid_: library item, bookmark, reading history entry, saved URL

**Series Entry Reading**:
The Library reading experience that starts from a selected Series Entry and continues forward through later saved Series Entries in the same Series.
_Avoid_: source chapter discovery, browser reading, reading history

**Explore**:
The browsing-oriented area for discovering readable or book-related content on the net from inside Buku. Explore may navigate to ordinary web pages, but it is product-framed around content discovery rather than being a standalone browser.

**Explore Browser**:
The in-app web navigation surface within Explore for visiting ordinary web pages during content discovery.
_Avoid_: Buku Browser, standalone browser

**Explore Browser Tab**:
A lightweight saved URL slot within the Explore Browser. It lets the user keep multiple discovery destinations and switch between them, without promising separate live browser sessions or full browser-style tab history.
A loaded Explore Browser Tab is labelled by the latest loaded page title when the page provides one; before a page has loaded, its URL remains the fallback label.
_Avoid_: browser tab, WebView session, reading history entry

**Explore Browser Back Stack**:
A capped per-tab list of recently visited Explore Browser URLs used to keep backward navigation useful across app restarts. It is not a user-visible browsing history, forward navigation history, or a restored live WebView session.
_Avoid_: browser history, tab history, WebView session history

**Reading Mode**:
A Buku-rendered reader view created from article content extracted from the current Explore Browser page.
_Avoid_: reader overlay, simplified page, live page restyling

**Chapter Navigation**:
The optional previous-chapter and next-chapter targets that Reading Mode can expose when the source page provides high-confidence chapter links.
_Avoid_: pagination, page navigation

**More**:
The overflow area for additional app menus that do not belong in Library or Explore.

**More Menu**:
The list of actions and destinations shown in More. Each item opens a separate More-owned view when the workflow needs more detail than a single row can carry.
_Avoid_: settings page, overflow page

**App Update**:
A newer Buku Android release that the user can discover from the More Menu and choose to install.
_Avoid_: software update, GitHub release, version check
