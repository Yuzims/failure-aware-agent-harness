# Implementation status

Canonical design spec: [`../design.md`](../design.md).

## Phase 1 — Domain Model — DONE

Investigation domain in `src/domain/`. Agent conclusions are claims to verify, not truth.

## Phase 2 — GitHub Data Layer — DONE

`GitHubDataProvider` with live REST and snapshot replay. Fixtures in `fixtures/github/`.

## Phase 3A — Investigation Agent — DONE

`src/investigation/` runs a bounded investigation through AgentLoop + GitHub tools. The agent cannot set `VERIFIED_COMPLETE`.

## Phase 4 — Independent Completion Verifier — DONE

Independent, deterministic completion verification.

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
        v
VerificationResult
```

**Agent conclusion ≠ verification result.**

`VerificationResult` is produced independently by the Harness (`IndependentCompletionVerifier`). The agent may investigate, collect evidence, and record claims. It cannot set `verified_complete`. Tool success and Agent prose are not completion.

Deterministic checks:

1. Issue identity (repository + number)
2. Issue state (`closed` is not `resolved`)
3. Resolution candidate (issue → timeline/relations → PR)
4. Pull request merged (`merged === true`)
5. Code / commit evidence when required
6. Critical claims supported without contradiction (`polarity` / `role`)
7. Phase 1 `EvidenceRequirement` coverage (optional gaps do not block)

Outcomes:

| Status | Meaning |
|---|---|
| `verified_complete` | All required checks pass |
| `not_verified` | Enough evidence to reject completion |
| `insufficient_evidence` | Key evidence missing; cannot prove completion |

Fixture behavior:

| Fixture | Target | Result |
|---|---|---|
| `fixtures/github/resolved.json` | acme/box#42 | `verified_complete` |
| `fixtures/github/closed-unmerged.json` | acme/box#99 | `not_verified` |
| `fixtures/github/insufficient-evidence.json` | acme/box#7 | `insufficient_evidence` |

GitHub issue/comment bodies remain `external_untrusted`. Prompt injection in fixture #7 does not become a Harness instruction.

Trace events: `verification_started`, `verification_check`, `verification_completed`.

Existing workspace `CompletionVerifier` (file/count/citation for synthetic demos) is unchanged.

## Not started

Phase 5+ (recovery redesign, benchmark expansion, semantic judge, UI redesign) waits for a new task.
