## ADDED Requirements

### Requirement: Externally influenced diagnostic values are neutralized
The plugin SHALL neutralize externally influenced record and control characters before including scalar values in diagnostics, so one diagnostic call cannot create forged additional log records.

#### Scenario: Property-inspector value contains a line break
- **WHEN** a context, event, action, address, discovery message, or error value containing carriage-return or newline characters reaches a diagnostic sink
- **THEN** the emitted diagnostic contains the value without creating an additional logical log record

#### Scenario: Ordinary value is logged
- **WHEN** an externally influenced value contains only ordinary printable characters
- **THEN** the diagnostic preserves its useful textual value

### Requirement: Diagnostics use explicitly selected fields
The plugin SHALL emit constant diagnostic messages with explicitly selected scalar fields and SHALL NOT write complete settings, payload, event, or error objects to the console.

#### Scenario: Global settings are received
- **WHEN** the plugin processes global settings
- **THEN** diagnostics report only explicitly selected non-sensitive configuration state

#### Scenario: Global settings are saved
- **WHEN** the plugin sends updated global settings to Stream Deck
- **THEN** diagnostics report only explicitly selected non-sensitive configuration state

### Requirement: Diagnostics exclude credential values
The plugin MUST NOT include TP-Link email or password values in diagnostic output, whether directly, through interpolation, or through object serialization.

#### Scenario: Credentials are configured
- **WHEN** global settings contain a TP-Link email and password
- **THEN** diagnostics may indicate that credentials are configured but contain neither credential value

#### Scenario: Error occurs during authenticated operation
- **WHEN** an authenticated discovery or device operation fails
- **THEN** the resulting diagnostic excludes stored credential values and safely renders selected error text
