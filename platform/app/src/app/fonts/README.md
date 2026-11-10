# Fonts

Host Grotesk (variable, 300 to 800) and JetBrains Mono (variable, 400 to 500 used), Latin subset, from Google Fonts.
Both are under the SIL Open Font License 1.1. They are kept in the repository and loaded with `next/font/local`
so the app's build never downloads anything: a Google Fonts hiccup on the build host failed a deploy on 11 Nov 2026.
