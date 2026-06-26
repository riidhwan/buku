# Use a high global unit coverage threshold

The default unit test gate enforces code coverage and fails below 98% globally for statements, branches, functions, and lines. This keeps the unit-heavy architecture honest without using per-file thresholds that would make small Angular and Ionic wiring files disproportionately brittle.
