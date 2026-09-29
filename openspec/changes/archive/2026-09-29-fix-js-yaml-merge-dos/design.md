# Design

`markdownlint-cli@0.49.1` is already the latest release and requires `js-yaml ~5.2.1`, excluding patched 5.4.2. An npm override limited to `markdownlint-cli` selects 5.4.2 without changing the unrelated Jest dependency, which uses `js-yaml` 3.15.2 under a separate override. Record the npm registry SHA-512 integrity in the lockfile and verify the result with `npm ci`, Markdown lint, and tests. Replacing the linter is unnecessary while this scoped override remains compatible.
