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

**Explore**:
The browsing-oriented area for discovering readable or book-related content on the net from inside Buku. Explore may navigate to ordinary web pages, but it is product-framed around content discovery rather than being a standalone browser.

**Explore Browser**:
The in-app web navigation surface within Explore for visiting ordinary web pages during content discovery.
_Avoid_: Buku Browser, standalone browser

**Reading Mode**:
A Buku-rendered reader view created from article content extracted from the current Explore Browser page.
_Avoid_: reader overlay, simplified page, live page restyling

**Chapter Navigation**:
The optional previous-chapter and next-chapter targets that Reading Mode can expose when the source page provides high-confidence chapter links.
_Avoid_: pagination, page navigation

**More**:
The overflow area for additional app menus that do not belong in Library or Explore.
