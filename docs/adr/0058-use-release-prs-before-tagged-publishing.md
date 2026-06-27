# Use release PRs before tagged publishing

Buku releases go through a `release/<version>` pull request before any public tag or GitHub Release is created. The release PR runs an extra release-build quality gate, and after it is merged automation creates the version tag from the merge result and starts GitHub Release publishing.
