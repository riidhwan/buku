# Release Playbook

This playbook records the operational release process for Buku's GitHub Releases Android channel.

## Release Channel

Buku's first Android release channel is GitHub Releases. Release automation publishes a signed APK asset to a versioned GitHub Release so Android users can install it directly, and so a future in-app updater can discover and download releases from the same source.

Buku has one public stable release channel initially. Internal, nightly, beta, or staged release tracks are deferred until there is a real testing or audience need.

Each GitHub Release must include a signed APK named `buku-<version>.apk` and a `SHA256SUMS` file covering published release assets.

The initial release automation only prepares the contract needed by a future in-app updater. The updater feature is deferred, but it can rely on semver tags formatted as `v<version>`, a signed APK asset, checksum metadata, stable Android package id, stable signing key, and source-owned Android `versionName` and `versionCode`.

Do not add a separate release manifest yet. `package.json`, Android `versionName`, Android `versionCode`, the Git tag, the APK filename, and `SHA256SUMS` are the release metadata sources until the updater needs richer metadata.

## Release Flow

Releases start from a branch named `release/<version>`, where `<version>` is the public app version to publish. The release branch must be reviewed and merged through a pull request into `master` before a tag or GitHub Release is created.

The release pull request owns the app version bump. `package.json` `version` and Android `versionName` must match `<version>`, Android `versionCode` must be an explicit source-owned integer greater than the current `master` value, and the eventual Git tag must be `v<version>`. Release automation publishes the reviewed version metadata; it does not invent or rewrite it after merge.

Release pull requests run the normal pull request quality gates unchanged, plus a separate release-check job that runs `pnpm build`, `pnpm cap:sync:android`, and `./gradlew assembleRelease` with the disposable release-check keystore. The release-check job proves the signed Android release artifact can be built from the proposed release state without duplicating the normal format, lint, and unit test jobs.

The release-check job may upload its disposable-signed APK as a short-lived workflow artifact named `buku-<version>-release-check.apk`, retained for 7 days. This artifact is for debugging only and must not be attached to GitHub Releases.

When a pull request whose head branch is `release/<version>` is closed as merged into `master`, automation validates that the merged commit still has matching version metadata, creates tag `v<version>` from that merge result, and immediately publishes the GitHub Release. The release pull request is the human approval gate; GitHub Releases are not held as drafts for a second manual approval step.

Publishing rebuilds the signed APK from the merged `master` commit with the production release keystore. Artifacts from the release pull request gate are proof of buildability only; they are not uploaded as public release assets.

Automatic post-merge publishing must fail if tag `v<version>` or the matching GitHub Release already exists. Once created, release tags are immutable. If post-merge publishing fails after tag creation, use a separate manual recovery workflow to retry publishing from the existing tag instead of deleting or recreating the tag.

Release notes are generated from commit history for now. Buku does not maintain a human-written changelog until the project has enough release-management capacity to justify it.

## Signing Material

Release signing uses one long-lived Android keystore that is never committed to git. CI reconstructs the keystore from GitHub Actions secrets only during release builds.

Required repository secrets:

- `ANDROID_RELEASE_KEYSTORE_BASE64`: base64-encoded keystore file
- `ANDROID_RELEASE_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_RELEASE_KEY_ALIAS`: key alias inside the keystore
- `ANDROID_RELEASE_KEY_PASSWORD`: key password

Required repository secrets for release pull request checks:

- `ANDROID_RELEASE_CHECK_KEYSTORE_BASE64`: base64-encoded disposable release-check keystore file
- `ANDROID_RELEASE_CHECK_KEYSTORE_PASSWORD`: release-check keystore password
- `ANDROID_RELEASE_CHECK_KEY_ALIAS`: release-check key alias
- `ANDROID_RELEASE_CHECK_KEY_PASSWORD`: release-check key password

Production signing secrets should be scoped to a GitHub Environment named `release`. The environment does not require a second manual approval initially; the release pull request remains the approval gate, and the environment provides a place to add stricter protection later.

Local release builds should use the same keystore through local-only environment variables or an untracked Gradle properties file. Do not commit keystores, decoded secrets, passwords, or machine-specific signing paths.

Release pull request gates should not use the production release keystore. They should use a separate disposable CI release-check keystore that proves `assembleRelease` and packaging work with signing configured. The production release keystore is reserved for post-merge publishing.

## Revisit Triggers

Revisit this playbook when any of these change:

- Distribution moves from GitHub Releases to Google Play or another app store.
- The app needs Android App Bundle (`.aab`) artifacts instead of APK-only distribution.
- Signing keys need rotation, recovery, or separation between internal and public release channels.
- The in-app updater is implemented and needs stricter release asset naming, metadata, rollout, or compatibility rules.
- A release must support multiple tracks such as nightly, beta, and stable.
