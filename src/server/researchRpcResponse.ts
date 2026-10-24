
export class ResearchRpcResponseError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ResearchRpcResponseError';
  }
}

export type ResearchReservationStatus =
  | 'reserved'
  | 'rejected'
  | 'ambiguous'
  | 'succeeded'
  | 'failed'
  | 'apify_running'
  | 'apify_complete'
  | 'apify_failed'
  | 'openrouter_running'
  | 'openrouter_complete'
  | 'openrouter_failed';

export interface ResearchReservationResponse {
  success: boolean;
  idempotent: boolean;
  status: ResearchReservationStatus;
  creditsReserved?: number;
  creditsRemaining?: number;
  providerBudgetReservedMicroUsd?: number;
  required?: number;
}

export type ResearchReservationDecision =
  | 'new_reservation'
  | 'existing_reservation'
  | 'already_processing'
  | 'stage_failed'
  | 'already_succeeded'
  | 'rejected'
  | 'failed'
  | 'ambiguous';

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) &&
    Reflect.ownKeys(value).every(key => typeof key === 'string' &&
      'value' in Object.getOwnPropertyDescriptor(value, key)!);
}

function isNonNegativeInteger(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function parseResearchReservationResponse(
  value: unknown
): ResearchReservationResponse {
  if (!isRecord(value)) {
    throw new ResearchRpcResponseError(
      'INVALID_RESPONSE',
      'Research reservation response must be an object.'
    );
  }

  const { success, idempotent, status } = value;

  const allowedFields = ['success', 'idempotent', 'status', 'credits_reserved',
    'credits_remaining', 'provider_budget_reserved_micro_usd', 'required'];
  if (Object.getOwnPropertyNames(value).some(field => !allowedFields.includes(field))) {
    throw new ResearchRpcResponseError('INVALID_RESPONSE', 'Research reservation has unexpected fields.');
  }

  if (
    typeof success !== 'boolean' ||
    typeof idempotent !== 'boolean' ||
    typeof status !== 'string'
  ) {
    throw new ResearchRpcResponseError(
      'INVALID_RESPONSE',
      'Research reservation response has invalid required fields.'
    );
  }

  const allowedStatuses: ResearchReservationStatus[] = [
    'reserved',
    'rejected',
    'ambiguous',
    'succeeded',
    'failed',
    'apify_running',
    'apify_complete',
    'apify_failed',
    'openrouter_running',
    'openrouter_complete',
    'openrouter_failed'
  ];

  if (!allowedStatuses.includes(
    status as ResearchReservationStatus
  )) {
    throw new ResearchRpcResponseError(
      'UNKNOWN_STATUS',
      'Research reservation returned an unknown status.'
    );
  }

  const numericFields = [
    'credits_reserved',
    'credits_remaining',
    'provider_budget_reserved_micro_usd',
    'required'
  ] as const;

  for (const field of numericFields) {
    if (
      Object.hasOwn(value, field) &&
      !isNonNegativeInteger(value[field])
    ) {
      throw new ResearchRpcResponseError(
        'INVALID_RESPONSE',
        `Research reservation has an invalid ${field}.`
      );
    }
  }

  // M2 existing-job replay: success is false ONLY for failed/rejected.
  // The same rule also matches both fresh reserved/rejected return paths.
  if (success !== (status !== 'failed' && status !== 'rejected')) {
    throw new ResearchRpcResponseError(
      'INCONSISTENT_RESPONSE',
      'Research reservation success contradicts its job status.'
    );
  }

  if (idempotent && (
    !isNonNegativeInteger(value.credits_reserved) || value.credits_reserved === 0 ||
    !isNonNegativeInteger(value.provider_budget_reserved_micro_usd)
  )) {
    throw new ResearchRpcResponseError('INVALID_RESPONSE', 'Existing reservation is missing credit or budget details.');
  }

  if (
    !idempotent &&
    status !== 'reserved' &&
    status !== 'rejected'
  ) {
    throw new ResearchRpcResponseError(
      'INCONSISTENT_RESPONSE',
      'New reservations must be reserved or rejected.'
    );
  }

  if (
    !idempotent &&
    status === 'reserved' &&
    (
      !isNonNegativeInteger(value.credits_reserved) ||
      value.credits_reserved === 0 ||
      !isNonNegativeInteger(value.credits_remaining) ||
      !isNonNegativeInteger(
        value.provider_budget_reserved_micro_usd
      )
    )
  ) {
    throw new ResearchRpcResponseError(
      'INVALID_RESPONSE',
      'New reservation is missing credit or budget details.'
    );
  }

  if (
    !idempotent &&
    status === 'rejected' &&
    (
      !isNonNegativeInteger(value.required) ||
      value.required === 0 ||
      !isNonNegativeInteger(value.credits_remaining)
    )
  ) {
    throw new ResearchRpcResponseError(
      'INVALID_RESPONSE',
      'Rejected reservation is missing credit details.'
    );
  }

  return {
    success,
    idempotent,
    status: status as ResearchReservationStatus,
    ...(value.credits_reserved != null && {
      creditsReserved: value.credits_reserved as number
    }),
    ...(value.credits_remaining != null && {
      creditsRemaining: value.credits_remaining as number
    }),
    ...(value.provider_budget_reserved_micro_usd != null && {
      providerBudgetReservedMicroUsd:
        value.provider_budget_reserved_micro_usd as number
    }),
    ...(value.required != null && {
      required: value.required as number
    })
  };
}

export function classifyResearchReservation(
  response: ResearchReservationResponse
): ResearchReservationDecision {
  if (response.status === 'ambiguous') {
    return 'ambiguous';
  }

  if (response.status === 'rejected') {
    return 'rejected';
  }

  if (response.status === 'failed') {
    return 'failed';
  }

  if (response.status === 'apify_failed' || response.status === 'openrouter_failed') {
    return 'stage_failed';
  }

  if (response.status === 'succeeded') {
    return 'already_succeeded';
  }

  if (response.status === 'reserved') {
    return response.idempotent
      ? 'existing_reservation'
      : 'new_reservation';
  }

  return 'already_processing';
}
