<!-- markdownlint-disable MD013 MD022 MD032 MD041 -->

## Context

The plugin accepts Stream Deck events through a localhost WebSocket. Event metadata, property-inspector payloads, settings, device addresses, and error messages currently reach several `console` calls without a consistent log-boundary policy. CodeQL reports 27 log-injection paths, while two of those paths log the complete global-settings object containing TP-Link credentials. The codebase already has `sanitizeLogValue()` and focused unit tests, but usage is incomplete.

CodeQL also reports 26 high-severity user-controlled-bypass findings. Their sinks are message dispatch, device-type selection, UI state selection, and required-value checks—not authorization decisions. The remaining Scorecard alert reflects recent SAST-workflow adoption rather than an absent workflow.

## Goals / Non-Goals

**Goals:**

- Ensure each externally influenced diagnostic value is rendered as inert, single-record text.
- Prevent credentials and other unbounded sensitive objects from entering diagnostics.
- Keep stored credential values out of property-inspector response messages.
- Preserve useful operational diagnostics and existing plugin behavior.
- Resolve actionable CodeQL alerts and document defensible dispositions for non-actionable alerts.

**Non-Goals:**

- Redesign Stream Deck's localhost WebSocket trust model.
- Add authentication or authorization to property-inspector message dispatch.
- Change how Stream Deck persists global settings.
- Replace `console` with a new logging framework or add a dependency.
- Retroactively generate CodeQL analyses for commits created before SAST was enabled.

## Decisions

### Centralize scalar neutralization at diagnostic boundaries

Retain a small, deterministic `sanitizeLogValue()` boundary and apply it to every externally influenced scalar used by the 27 reported sinks, including context IDs, event/action names, IP values, discovery messages, and externally derived errors. The sanitizer will prevent CR/LF and other selected record/control characters from creating additional logical log records while preserving readable values.

Using the existing helper is preferred over scattered regular expressions because it gives CodeQL and unit tests one auditable sanitizer. A logging dependency was rejected because the plugin needs only value neutralization and secret exclusion, not a new logging subsystem.

### Allowlist diagnostic fields instead of serializing objects

Diagnostics will use constant messages with explicitly selected safe fields. Complete `globalSettings`, payload, event, and error objects will not be passed to `console`. Global-settings diagnostics may report non-sensitive state such as whether credentials or an IP range are configured, but never credential values.

Sanitizing a serialized settings object was rejected: it prevents record forging but does not prevent secret disclosure.

### Replace credential retrieval with credential-presence state

The `globalCredentialsRetrieved` message will carry `credentialsConfigured: boolean` rather than `tapoEmail` and `tapoPassword`. The property inspector only needs this state to render its sign-in/sign-out control, so returning secret values has no functional benefit. Save and clear operations remain unchanged, and both sides of the internal message contract will migrate together.

### Treat dispatch alerts as trust-model false positives

Alerts #31–#56 will be dismissed as false positives. Their conditions select requested operations or enforce input preconditions; they do not grant privileges based on attacker-asserted identity. The dismissal comment will state the Stream Deck property inspector trust boundary and the non-authorization purpose of the condition.

This does not prevent adjacent hardening. In particular, the credential response is narrowed even though the dispatch alert itself is not an authorization bypass.

### Preserve SAST regression visibility

Scorecard alert #11 will not be dismissed. CodeQL already runs for main pushes, pull requests, and on a weekly schedule. The warning should resolve as analyzed commits replace older uncovered commits and a later Scorecard run observes them. Keeping the alert active avoids permanently suppressing a future SAST regression under the same fingerprint.

### Validate locally and in GitHub

Unit tests will cover sanitizer behavior, safe settings diagnostics, absence of credential values, and both configured/unconfigured property-inspector states. Final verification requires a CodeQL run because closing alerts depends on CodeQL's data-flow model, not only runtime tests.

## Risks / Trade-offs

- **[Risk] Sanitization reduces readability for malformed values** → Preserve ordinary printable text and alter only record/control characters.
- **[Risk] A reported sink remains tainted through an overlooked interpolation** → Map tests and review directly to alerts #57–#83, then confirm with GitHub CodeQL.
- **[Risk] Credential values leak through another object-style log outside the current findings** → Audit all `console` calls in `plugin.js` while changing the reported sinks and prohibit complete sensitive objects.
- **[Risk] The property inspector and plugin disagree on the migrated payload** → Update both sides atomically and test configured and unconfigured responses.
- **[Risk] Dismissal hides a real authorization boundary** → Limit dismissal to the enumerated dispatch/precondition alerts and record the concrete Stream Deck trust-boundary rationale.
- **[Trade-off] Scorecard #11 remains visible temporarily** → Prefer temporary noise over suppressing future SAST coverage regressions.

## Migration Plan

1. Extend safe-log behavior and tests, then migrate all reported diagnostic sinks.
2. Change the credential-state response and property-inspector consumer together.
3. Run the complete local test suite and inspect diagnostics for secret values.
4. Push the change and confirm CodeQL alerts #57–#83 close without replacement alerts.
5. Dismiss #31–#56 with the agreed false-positive reason and per-group comment.
6. Leave #11 active and verify closure after sufficient analyzed main-branch history and a subsequent Scorecard run.

Rollback consists of reverting the application changes and alert dispositions. Alert dismissals can be reopened independently; #11 requires no rollback action.

## Open Questions

None. The existing sanitizer, property-inspector usage, alert data flows, and workflow triggers provide enough information for implementation.
