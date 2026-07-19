## Why

The repository has 54 open code-scanning findings: 27 actionable log-injection flows, 26 false-positive user-controlled-bypass alerts, and one temporary SAST-coverage warning. The actionable findings should be resolved now because externally influenced values can forge diagnostics and two affected log statements expose stored TP-Link credentials.

## What Changes

- Neutralize externally influenced values before writing them to plugin diagnostics.
- Stop logging complete settings, payload, event, and error objects; emit only explicitly selected, non-sensitive fields.
- Redact TP-Link email and password values from all global-settings diagnostics.
- Replace the property inspector's credential retrieval response with credential-presence state so stored passwords are not returned to the UI.
- Add focused tests for control-character neutralization, safe diagnostic formatting, secret redaction, and the credential-state message contract.
- Dismiss CodeQL alerts #31–#56 as false positives with a documented Stream Deck trust-boundary rationale.
- Keep Scorecard alert #11 open until continued CodeQL coverage causes it to resolve, rather than permanently suppressing future SAST regressions.
- Re-run CodeQL and verify that alerts #57–#83 close without replacement findings.

## Capabilities

### New Capabilities
- `secure-plugin-logging`: Plugin diagnostics neutralize untrusted control characters and exclude secrets and unbounded sensitive objects.
- `credential-confidentiality`: Stored TP-Link credential values are excluded from diagnostics and property-inspector responses; the UI receives only credential-presence state.

### Modified Capabilities

None.

## Impact

- Affected code: `plugin.js`, `property-inspector.html`, and logging/message-contract tests under `__tests__/`.
- Internal interface: the `globalCredentialsRetrieved` payload changes from returning credential values to returning a boolean configuration state; plugin and property inspector change together.
- Security operations: GitHub code-scanning alert dispositions and follow-up CodeQL/Scorecard verification.
- Dependencies and public APIs: no new dependency and no externally supported API change.
