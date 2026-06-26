# Use specific path aliases

The project uses specific path aliases for architectural roots: `@core/*`, `@shared/*`, `@features/*`, and `@env/*`. It avoids a broad `@app/*` alias because broad aliases weaken boundary readability and make import direction harder to audit.
