# Bundle Core E-Reading Fonts For Series Entry Reading Appearance

Buku bundles the ebook-fonts Core Collection from the pinned `other-core-fonts.zip` release asset instead of downloading fonts at runtime or using Kobo-specific font builds. The font choice is a persisted Library-owned Series Entry Reading Appearance preference, scoped to Series Entry Reading only, with `NV Charis` as the default and stable internal font ids for persisted values.

Bundling keeps Series Entry Reading offline and deterministic on Android WebView, while the `other-core` package avoids choosing Kobo renderer-specific assets for a non-Kobo runtime. The scope deliberately excludes Explore Reading Mode until a shared reader appearance model is justified.
