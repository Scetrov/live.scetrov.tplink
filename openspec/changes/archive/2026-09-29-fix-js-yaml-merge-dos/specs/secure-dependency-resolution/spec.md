## ADDED Requirements

### Requirement: Markdown lint resolves patched js-yaml
The project SHALL resolve `markdownlint-cli`'s `js-yaml` dependency to a version patched for GHSA-r3ph-w7gj-g6xm.

#### Scenario: Install Markdown lint tooling from the lockfile
- **WHEN** npm installs dependencies using the committed lockfile
- **THEN** `markdownlint-cli` resolves `js-yaml` to version 5.4.1 or newer
