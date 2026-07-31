# Share Reading Appearance across reader surfaces

Buku treats Reading Appearance as one persisted comfort preference shared by Reading Mode and Series Entry Reading. This supersedes the original Library-only scope from ADR 0066 because Explore now exposes the same reader appearance menu, and separate preferences would make identical reader controls drift across surfaces while preserving little domain value. The shared model and preference port belong in `shared/`, while each feature keeps its own reader workflow and UI ownership.
