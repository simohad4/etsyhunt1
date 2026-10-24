
import {
  parseResearchReservationResponse,
  classifyResearchReservation,
  ResearchRpcResponseError,
  type ResearchReservationResponse,
  type ResearchReservationDecision
} from './researchRpcResponse';

import type { PreparedResearchRequest } from './researchService';
import { assertResearchActivationReady } from './researchService';

export interface ResearchRpcClient {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
}

export class ResearchRpcError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ResearchRpcError';
  }
}

export interface ReserveResearchJobInput {
  requestId: string;
  userId: string;
  prepared: PreparedResearchRequest;
}

export interface ReserveResearchJobResult {
  response: ResearchReservationResponse;
  decision: ResearchReservationDecision;
}

// Pure mapping: no client, database access, activation override or side effects.
export function mapResearchReservationParameters(
  input: ReserveResearchJobInput
): Record<string, unknown> {
  const { requestId, userId, prepared } = input;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    typeof requestId !== 'string' || requestId.length !== 36 || !uuid.test(requestId) ||
    typeof userId !== 'string' || userId.length !== 36 || !uuid.test(userId)
  ) {
    throw new ResearchRpcError('INVALID_IDENTIFIERS', 'Request and user IDs must be UUIDs.');
  }

  return {
    p_request_id: requestId,
    p_user_id: userId,
    p_keyword: prepared.request.keyword,
    p_pages: prepared.request.pages,
    p_maximum_listings: prepared.request.maximumListings,
    p_request_fingerprint: prepared.fingerprint,
    p_pricing_version: prepared.pricingVersion,
    p_apify_actor: prepared.request.apifyActor,
    p_openrouter_model: prepared.request.openRouterModel
  };
}

export type ResearchReservationOutcome =
  | { kind: 'response'; result: unknown }
  | { kind: 'transport_error' };

// Pure outcome interpretation; deliberately accepts no executable transport.
export function resolveResearchReservationOutcome(
  outcome: ResearchReservationOutcome
): ReserveResearchJobResult {
  if (outcome.kind === 'transport_error') {
    throw new ResearchRpcError(
      'RPC_OUTCOME_UNKNOWN',
      'Research reservation outcome is unknown; reconcile by request ID before retrying.'
    );
  }

  const result = outcome.result;
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new ResearchRpcResponseError('INVALID_RESPONSE', 'Invalid research RPC result.');
  }
  if (!('error' in result) || !('data' in result)) {
    throw new ResearchRpcResponseError('INVALID_RESPONSE', 'Invalid research RPC result fields.');
  }
  if (result.error !== null) {
    throw new ResearchRpcError(
      'RPC_DATABASE_ERROR',
      'Research reservation was rejected by the database.'
    );
  }

  const response = parseResearchReservationResponse(result.data);
  const decision = classifyResearchReservation(response);

  return { response, decision };
}

// The only reservation executor. Never retry: a lost response may have reserved credits.
export async function reserveResearchJob(
  client: ResearchRpcClient,
  input: ReserveResearchJobInput
): Promise<ReserveResearchJobResult> {
  const parameters = mapResearchReservationParameters(input);
  assertResearchActivationReady();

  let result: unknown;
  try {
    result = await client.rpc('reserve_research_job', parameters);
  } catch {
    return resolveResearchReservationOutcome({ kind: 'transport_error' });
  }
  return resolveResearchReservationOutcome({ kind: 'response', result });
}
