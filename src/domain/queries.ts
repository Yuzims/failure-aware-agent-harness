import type {
  Claim,
  ClaimEvidence,
  Evidence,
  EvidenceRequirement,
  InvestigationAttempt,
  InvestigationRun,
  VerificationCheck,
  VerificationResult,
} from "./types.js";

export function supportingEvidenceIds(
  claimId: string,
  links: ClaimEvidence[],
): string[] {
  return links
    .filter((link) => link.claimId === claimId && link.role === "supports")
    .map((link) => link.evidenceId);
}

export function unsupportedClaims(
  claims: Claim[],
  links: ClaimEvidence[],
  evidence: Evidence[],
): Claim[] {
  const ids = new Set(evidence.map((item) => item.id));
  return claims.filter((claim) => {
    const supports = supportingEvidenceIds(claim.id, links).filter((id) => ids.has(id));
    return supports.length === 0;
  });
}

export function missingRequirements(
  requirements: EvidenceRequirement[],
  evidence: Evidence[],
): EvidenceRequirement[] {
  const kinds = new Set(evidence.map((item) => item.kind));
  return requirements.filter((requirement) => {
    if (requirement.satisfiedBy && requirement.satisfiedBy.length > 0) {
      const have = new Set(evidence.map((item) => item.id));
      return !requirement.satisfiedBy.some((id) => have.has(id));
    }
    return !kinds.has(requirement.kind);
  });
}

export function evidenceCoverage(
  requirements: EvidenceRequirement[],
  evidence: Evidence[],
): number {
  if (requirements.length === 0) {
    return 1;
  }
  const missing = missingRequirements(requirements, evidence).length;
  return (requirements.length - missing) / requirements.length;
}

export function criticalChecksPassed(checks: VerificationCheck[]): boolean {
  return checks
    .filter((check) => check.severity === "critical" || check.severity === "required")
    .every((check) => check.status === "pass");
}

/**
 * Agent 终答不参与判定。verified_complete 只在：
 * 关键/必需检查全过、必需证据齐、关键 Claim 都有 supporting evidence。
 */
export function buildVerificationResult(input: {
  checks: VerificationCheck[];
  requirements: EvidenceRequirement[];
  claims: Claim[];
  claimEvidence: ClaimEvidence[];
  evidence: Evidence[];
  agentClaimedComplete?: boolean;
}): VerificationResult {
  const missing = missingRequirements(input.requirements, input.evidence);
  const unsupported = unsupportedClaims(
    input.claims.filter((claim) => claim.critical),
    input.claimEvidence,
    input.evidence,
  );
  const checksOk = criticalChecksPassed(input.checks);
  const requiredMissing = missing.filter((item) => item.severity !== "optional");
  const complete =
    checksOk && requiredMissing.length === 0 && unsupported.length === 0 && input.checks.length > 0;

  return {
    status: complete ? "verified_complete" : "not_verified",
    checks: input.checks,
    evidenceCoverage: evidenceCoverage(input.requirements, input.evidence),
    unsupportedClaimIds: unsupported.map((claim) => claim.id),
    missingRequirementIds: missing.map((item) => item.id),
    prematureCompletion: Boolean(input.agentClaimedComplete) && !complete && checksOk,
  };
}

export function latestAttempt(
  run: InvestigationRun,
): InvestigationAttempt | undefined {
  return run.attempts.at(-1);
}
