## ADDED Requirements

### Requirement: Property inspector receives credential-presence state only
The plugin SHALL respond to a property-inspector credential-state request with `credentialsConfigured: boolean` and MUST NOT include stored TP-Link email or password values in the response.

#### Scenario: Both credential values are stored
- **WHEN** the property inspector requests global credential state and both TP-Link email and password are present
- **THEN** the plugin returns `credentialsConfigured: true` without returning either credential value

#### Scenario: Credential configuration is incomplete
- **WHEN** the property inspector requests global credential state and either TP-Link email or password is absent
- **THEN** the plugin returns `credentialsConfigured: false` without returning any stored credential value

### Requirement: Authentication UI uses credential-presence state
The property inspector SHALL derive its signed-in UI state solely from the `credentialsConfigured` response field.

#### Scenario: Credentials are configured
- **WHEN** the property inspector receives `credentialsConfigured: true`
- **THEN** it renders the configured or signed-in state

#### Scenario: Credentials are not configured
- **WHEN** the property inspector receives `credentialsConfigured: false`
- **THEN** it renders the sign-in state

### Requirement: Credential lifecycle updates presence state
Saving or clearing credentials SHALL update subsequent credential-presence responses without exposing credential values.

#### Scenario: Credentials are saved
- **WHEN** valid email and password values are saved and credential state is requested afterward
- **THEN** the plugin reports `credentialsConfigured: true` without returning the saved values

#### Scenario: Credentials are cleared
- **WHEN** credentials are cleared and credential state is requested afterward
- **THEN** the plugin reports `credentialsConfigured: false`
