# Fix js-yaml merge denial of service

Dependabot alert [#42](https://github.com/Scetrov/live.scetrov.tplink/security/dependabot/42) identifies GHSA-r3ph-w7gj-g6xm in the development-only `js-yaml` dependency of `markdownlint-cli`. The latest published `markdownlint-cli` (0.49.1) requires `js-yaml ~5.2.1`, so upgrading the direct dependency cannot resolve this alert.

Scope the existing npm override to `markdownlint-cli` and pin its `js-yaml` to patched 5.4.2. Leave the separately overridden Jest dependency on its existing major version and retain the Markdown lint workflow.
