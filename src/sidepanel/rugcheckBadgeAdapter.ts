/**
 * Rug Check Badge Adapter
 * Transforms tokenSecurity API response into UI badge values
 */

export interface RugcheckBadge {
  text: string;
  color: 'green' | 'orange' | 'red';
}

export interface RugcheckBadges {
  risk: RugcheckBadge;
  liqLock: RugcheckBadge;
  mintAuth: RugcheckBadge;
  honeypot: RugcheckBadge;
}

function getRiskScore(json: any): number {
  return (
    json?.riskScore ??
    json?.rugcheckSummary?.riskScore ??
    json?.rugcheckSummary?.score ??
    json?.score ??
    50
  );
}

function buildRiskBadge(score: number): RugcheckBadge {
  if (score >= 80) return { text: 'Safe', color: 'green' };
  if (score >= 65) return { text: 'Low', color: 'green' };
  if (score >= 50) return { text: 'Medium', color: 'orange' };
  if (score >= 35) return { text: 'High', color: 'red' };
  return { text: 'Extreme', color: 'red' };
}

function buildLiquidityBadge(json: any): RugcheckBadge {
  const pct = json?.rugcheckSummary?.lpLockedPct ?? 0;

  if (pct === 100) return { text: 'Locked', color: 'green' };
  if (pct > 50) return { text: 'Partial', color: 'orange' };
  return { text: 'Unlocked', color: 'red' };
}

function buildMintBadge(r: any): RugcheckBadge {
  const mintActive = r?.mintAuthority != null && r?.mintAuthority !== 'null';
  const freezeActive = r?.freezeAuthority != null && r?.freezeAuthority !== 'null';

  if (mintActive || freezeActive) return { text: 'Enabled', color: 'red' };
  return { text: 'Disabled', color: 'green' };
}

function buildHoneypotBadge(json: any): RugcheckBadge {
  const ext = json?.rugcheck?.token_extensions ?? {};
  const fee = json?.rugcheck?.transferFee?.pct ?? 0;

  const suspicious =
    ext?.nonTransferable === true ||
    ext?.defaultAccountState != null ||
    fee > 0;

  if (suspicious) return { text: 'Yes', color: 'red' };
  return { text: 'No', color: 'green' };
}

export function buildRugcheckBadges(json: any): RugcheckBadges {
  const score = getRiskScore(json);
  const r = json?.rugcheck ?? {};

  return {
    risk: buildRiskBadge(score),
    liqLock: buildLiquidityBadge(json),
    mintAuth: buildMintBadge(r),
    honeypot: buildHoneypotBadge(json),
  };
}
