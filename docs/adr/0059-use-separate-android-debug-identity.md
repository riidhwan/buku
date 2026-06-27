# Use separate Android debug identity

Buku Android debug builds use the package id suffix `.debug` so debug and release installs can coexist on the same device, while release keeps the stable `me.ramdhani.buku` identity needed for signed GitHub Release updates. Both variants keep the visible app label `Buku`; debug differentiation should come from a committed debug launcher icon once the real app icon replaces the current default icon, rather than from in-app UI or a temporary default-icon variant.

Android debug packaging should use Angular's development build, and Android release packaging should use Angular's production build. The generic `pnpm build` command remains the production web build for existing web and release expectations, while Android commands use explicit `android:sync:debug` and `android:sync:release` paths.
