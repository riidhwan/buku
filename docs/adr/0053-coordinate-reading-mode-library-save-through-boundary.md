# Coordinate Reading Mode Library save through a boundary

Reading Mode can offer an in-place save workflow for the current article snapshot, but Explore must not import Library directly to perform the write. Buku coordinates this workflow through a narrow integration boundary while Library owns the Series and Series Entry domain model, write use case, and persistence adapter. This keeps the save UI anchored in Reading Mode without weakening the feature-first dependency rule.
