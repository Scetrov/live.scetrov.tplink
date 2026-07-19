<!-- markdownlint-disable MD013 MD022 MD032 MD041 -->

## 1. Safe Diagnostic Tests

- [x] 1.1 Extend `sanitizeLogValue` tests to cover CR, LF, combined line breaks, selected control characters, nullish values, and preservation of ordinary printable text.
- [x] 1.2 Add tests that capture console output and prove externally influenced values produce one logical diagnostic record.
- [x] 1.3 Add tests proving global-settings diagnostics never contain TP-Link email or password values and do not serialize the complete settings object.

## 2. Safe Diagnostic Implementation

- [x] 2.1 Strengthen the shared diagnostic-value sanitizer to neutralize the tested record/control characters without changing ordinary printable values.
- [x] 2.2 Apply the safe diagnostic boundary to custom-range and discovery messages reported by alerts #57–#58.
- [x] 2.3 Apply the safe diagnostic boundary to device initialization, state, and lifecycle messages reported by alerts #59–#74.
- [x] 2.4 Apply the safe diagnostic boundary to WebSocket event, action, context, IP-range, and device-status messages reported by alerts #75, #77–#79, and #81–#83.
- [x] 2.5 Replace complete global-settings logs reported by alerts #76 and #80 with explicitly selected non-sensitive configuration state.
- [x] 2.6 Audit every remaining `console` call in `plugin.js` and remove complete settings, payload, event, and error object logging or unsafe externally influenced interpolation.

## 3. Credential-Confidentiality Contract

- [x] 3.1 Add tests for configured and unconfigured `globalCredentialsRetrieved` responses, asserting that neither email nor password values are returned.
- [x] 3.2 Change the plugin credential-state response to emit only `credentialsConfigured: boolean`.
- [x] 3.3 Change the property inspector to derive its authentication UI state from `credentialsConfigured` and remove its dependency on returned credential values.
- [x] 3.4 Add lifecycle coverage proving save and clear operations change subsequent credential-presence responses without exposing stored values.

## 4. Local Validation

- [x] 4.1 Run the complete Jest suite and resolve all failures.
- [x] 4.2 Review captured diagnostics and the final diff to confirm no credential value or unbounded sensitive object can reach console output.
- [x] 4.3 Confirm every actionable finding #57–#83 maps to a changed, tested diagnostic sink.

## 5. GitHub Security Alert Resolution

- [x] 5.1 Push the implementation and confirm CodeQL closes alerts #57–#83 without creating replacement log-injection or secret-exposure findings.
- [x] 5.2 Dismiss alerts #31–#56 as false positives, documenting that each condition is Stream Deck message/device dispatch, UI-state selection, or required-value validation rather than authorization.
- [ ] 5.3 Leave Scorecard alert #11 open and verify that it resolves after sufficient analyzed main-branch history and a subsequent Scorecard run.
- [x] 5.4 Record any alert that does not close as follow-up work rather than dismissing an unexplained result.
