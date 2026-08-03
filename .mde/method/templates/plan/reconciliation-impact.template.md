---
type: template
template: reconciliation-impact
artifact: impact
---

# Drift Reconciliation Impact

## Detected Changes

| File | Layer | Change Type | Author | Status |
|---|---|---|---|---|
| {{path}} | {{layer}} | {{added|modified|deleted|renamed}} | {{user|mde|mixed}} | {{unreconciled|accepted|rejected}} |

## Reconciliation Direction

Direction: {{forward|backward|mixed|reject}}

Reason:

{{reason}}

## Inferred Upstream Changes

| Target | Proposed Change | Requires Approval? |
|---|---|---|
| {{specs artifact}} | {{change}} | {{yes|no}} |

## Downstream Impact

| Target | Required Action |
|---|---|
| {{artifact}} | {{action}} |

## Validation Findings

| Severity | Finding | Recommendation |
|---|---|---|
| {{error|warning|info}} | {{finding}} | {{recommendation}} |

## User Decision Options

- Accept retrofit upstream
- Apply downstream impact
- Keep as source-only/output-only change
- Reject drift and restore/overwrite
- Merge manually
