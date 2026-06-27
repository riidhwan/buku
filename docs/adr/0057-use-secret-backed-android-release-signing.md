# Use secret-backed Android release signing

Buku release builds use a long-lived Android signing keystore kept outside git and injected into GitHub Actions from repository secrets. Stable signing is required so GitHub Release APKs can update existing installs, while keeping the keystore binary and passwords out of the repository.
