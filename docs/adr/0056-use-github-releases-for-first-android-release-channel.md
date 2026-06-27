# Use GitHub Releases for first Android release channel

Buku's first release pipeline publishes signed Android APKs to GitHub Releases instead of Google Play. This keeps distribution aligned with the planned in-app update flow, where the user opens App Update from the More Menu, manually checks the latest stable GitHub Release, compares the installed Android version name with the release tag as SemVer, and downloads the release APK directly.

The update flow ignores drafts and prereleases, accepts release tags with or without a leading `v`, and installs only a release asset whose filename matches the expected Buku release APK pattern for that version, such as `buku-0.1.1.apk`. A newer stable release without a matching APK is treated as invalid release metadata rather than "up to date." Buku launches Android's package installer for the downloaded APK; if Android requires the user to allow installs from Buku, the app opens the system settings screen and lets the user retry.

The app uses GitHub's public unauthenticated Releases API for manual checks. Buku does not embed a GitHub token in the client app.
