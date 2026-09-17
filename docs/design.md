# Design notes

The full implementation specification lives at [`../design.md`](../design.md). This file records architecture that has been implemented.

## Phase 4 — Independent Completion Verifier — DONE

Agent conclusion is not truth. The Harness independently verifies completion.

```text
Investigation Agent
        |
        | observations / evidence / claims
        v
    Harness State
        |
        v
Independent Completion Verifier
        |
        +--> deterministic checks
        |
        +--> evidence requirements
        |
        +--> claim/evidence consistency
        |
        v
VerificationResult
```

`VerificationResult` is produced by `IndependentCompletionVerifier` after the Investigation Agent finishes. The agent cannot set `verified_complete`. Final-answer prose is ignored.

See [`implementation-status.md`](implementation-status.md) for check list, statuses, and fixture results.
