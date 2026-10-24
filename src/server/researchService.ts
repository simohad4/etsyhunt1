
import {
  CURRENT_RESEARCH_PROVIDER_PRICING,
  DEFAULT_RETRY_POLICY,
  RESEARCH_PRICING_VERSION,
  assertProviderPricingReady,
  createResearchRequestFingerprint,
  validateResearchRequest,
  type BoundedResearchRequest
} from './researchEconomics';

export interface PreparedResearchRequest {
  request: BoundedResearchRequest;
  fingerprint: string;
  pricingVersion: string;
}

export function prepareResearchRequest(
  input: unknown
): PreparedResearchRequest {
  const request = validateResearchRequest(input);

  const fingerprint = createResearchRequestFingerprint(
    request,
    RESEARCH_PRICING_VERSION,
    DEFAULT_RETRY_POLICY
  );

  return {
    request,
    fingerprint,
    pricingVersion: RESEARCH_PRICING_VERSION
  };
}

export function assertResearchActivationReady(): void {
  assertProviderPricingReady(CURRENT_RESEARCH_PROVIDER_PRICING);
}
