# Split web and Android CI jobs

GitHub Actions CI should separate web quality checks from Android quality checks. This keeps TypeScript, lint, unit test, and Angular build failures distinct from Capacitor sync, Gradle, Java, Android SDK, and native build failures.
