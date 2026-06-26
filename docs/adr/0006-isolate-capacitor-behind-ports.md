# Isolate Capacitor behind ports

Capacitor and native Android APIs are accessed only through infrastructure adapters that implement application-layer ports. Presentation and domain code must not import Capacitor directly, which keeps device behavior replaceable in tests and prevents native concerns from leaking through the feature.
