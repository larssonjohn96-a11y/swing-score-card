export const HCP_AUDIT_ACCEPTABLE_DELTA = 0.5;
export const HCP_AUDIT_BLOCKING_DELTA = 1.5;

export type HcpAuditDisposition = "acceptable" | "review" | "blocking";

export type HcpAuditResult = {
  legacy: number;
  candidate: number;
  delta: number;
  absolute_delta: number;
  disposition: HcpAuditDisposition;
  explanation_required: boolean;
  causes: string[];
};

/**
 * Migration gate only. It never decides which calculation is "right".
 * Deltas above 0.5 HCP require a concrete explanation; above 1.5 block migration.
 */
export function auditHcpPair(legacy: number, candidate: number, causes: string[] = []): HcpAuditResult {
  const delta = candidate - legacy;
  const absoluteDelta = Math.abs(delta);
  const disposition: HcpAuditDisposition = absoluteDelta <= HCP_AUDIT_ACCEPTABLE_DELTA
    ? "acceptable"
    : absoluteDelta <= HCP_AUDIT_BLOCKING_DELTA
      ? "review"
      : "blocking";

  return {
    legacy,
    candidate,
    delta,
    absolute_delta: absoluteDelta,
    disposition,
    explanation_required: disposition !== "acceptable",
    causes,
  };
}
