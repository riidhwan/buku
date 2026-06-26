# Use scaffold-verified JDK

The project does not pin Java 17 or Java 21 before the Android scaffold exists. CI and local documentation should use the JDK required by the generated Capacitor Android project's Android Gradle Plugin and Android Studio baseline, then pin that verified version explicitly.
