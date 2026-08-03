---
type: integration
template: integration
artifact: design-specs
version: 1
mergePolicy: user-owned
---

# Integration: {{external_system_name}}

## Integration ID

{{integration_id}}

## Purpose and Ownership

| Item | Value |
|---|---|
| External system | {{external_system_name}} |
| External owner | {{external_owner}} |
| Internal owner | {{internal_owner}} |
| Business purpose | {{business_purpose}} |
| Contract provenance | {{contract_source_or_import_path}} |

## Scope

### Included

- {{included_scope}}

### Excluded

- {{excluded_scope}}

## Affected Capabilities and Use Cases

| Capability / Use Case | Dependency on Integration |
|---|---|
| {{capability_or_use_case}} | {{dependency}} |

## Integration Direction and Mechanism

| Item | Selection |
|---|---|
| Direction | {{inbound_outbound_bidirectional}} |
| Mechanism | {{api_webhook_event_file_sync_shared_data}} |
| Trigger / schedule | {{trigger_or_schedule}} |
| External endpoint/topic/file | {{external_contract_location}} |
| Internal interface | {{internal_interface}} |
| Adapter location | {{adapter_location}} |

## Data and Decision Ownership

| Entity / Field / Decision | Authoritative System | Conflict Resolution | Notes |
|---|---|---|---|
| {{item}} | {{source_of_truth}} | {{resolution}} | {{notes}} |

## Contract and Mapping

| Internal Model | External Model | Mapping / Validation |
|---|---|---|
| {{internal_field}} | {{external_field}} | {{mapping_and_validation}} |

Record identifiers, enums, units, timestamps/time zones, nullability, lifecycle states,
and incompatible values explicitly.

## Authentication, Authorization, and Secrets

| Concern | Design |
|---|---|
| Authentication | {{authentication}} |
| Authorization | {{authorization}} |
| Secret storage | {{secret_storage}} |
| Data classification | {{data_classification}} |
| Redaction / retention | {{redaction_and_retention}} |

## Reliability

| Concern | Policy |
|---|---|
| Timeout | {{timeout}} |
| Retry / backoff | {{retry_policy}} |
| Rate limits | {{rate_limits}} |
| Idempotency key / strategy | {{idempotency}} |
| Duplicate / replay handling | {{duplicate_handling}} |
| Ordering / concurrency | {{ordering_and_concurrency}} |
| Delivery / consistency expectation | {{delivery_and_consistency}} |

## Failure Handling and Recovery

| Failure | Application Behavior | Recovery / Reconciliation |
|---|---|---|
| {{failure}} | {{behavior}} | {{recovery}} |

Describe partial completion, checkpoints, restart behavior, manual remediation, and
user-visible unavailable states.

## Versioning and Compatibility

| Item | Policy |
|---|---|
| Supported contract versions | {{supported_versions}} |
| Compatibility strategy | {{compatibility_strategy}} |
| Unknown/incompatible version | {{incompatible_behavior}} |
| Change notification owner | {{change_owner}} |

## Observability and Audit

| Signal | Requirement |
|---|---|
| Correlation | {{correlation}} |
| Logging | {{logging}} |
| Metrics | {{metrics}} |
| Alerting | {{alerting}} |
| Audit | {{audit}} |

## Testing

| Test Level | Coverage | Environment / Evidence |
|---|---|---|
| Unit | {{mapping_validation_idempotency}} | {{unit_evidence}} |
| Contract | {{contract_cases}} | {{fixture_emulator_sandbox}} |
| Integration | {{adapter_cases}} | {{integration_environment}} |
| Behavioral | {{workflow_and_failure_cases}} | {{behavioral_evidence}} |

## Rollout, Fallback, and Decommission

{{rollout_fallback_and_decommission}}

## Open Questions

- {{open_question}}

## Notes

<!-- User-guarded zone. Add free-form notes here; they survive AI regeneration of the structured sections above. -->
