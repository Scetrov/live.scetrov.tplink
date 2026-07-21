# secure-dependency-resolution Specification

## Purpose
TBD - created by syncing change fix-brace-expansion-vulnerability. Update Purpose after archive.

## Requirements
### Requirement: Resolved dependencies exclude vulnerable brace-expansion versions
The project SHALL resolve every `brace-expansion` package instance to a version outside the vulnerable ranges published in GHSA-3jxr-9vmj-r5cp.

#### Scenario: Dependency tree is installed from the lockfile
- **WHEN** npm installs dependencies using the committed lockfile
- **THEN** no resolved `brace-expansion` instance is below 1.1.16, in the 2.x range below 2.1.2, or in the 3.x through 5.x range below 5.0.7

### Requirement: Dependency remediation preserves project validation
The project SHALL retain successful existing automated validation after updating its dependency resolution.

#### Scenario: Validation runs after the lockfile update
- **WHEN** the refreshed dependency metadata is installed
- **THEN** the project's test and Markdown lint commands complete successfully
