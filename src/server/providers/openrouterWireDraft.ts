import { MAX_OPENROUTER_INPUT_BYTES, MAX_OPENROUTER_INPUT_TOKENS } from '../researchEconomics';
import { buildOpenRouterRequest, validateOpenRouterResponse, OPENROUTER_PROJECTION_VERSION,
  MAX_OPENROUTER_RESPONSE_BYTES } from './openrouterAdapter';
import { freeze, integer, json, object, reject, text } from './adapterContract';
import { block, guarded, WIRE_DRAFT_SAFETY } from './wireDraftContract';

/** Structured content contains interpretations only; model/usage come from the envelope. */
export function buildOpenRouterWireDraft(contextJson: unknown, maximumOutputTokens?: unknown) {
  return guarded('INVALID_INPUT', () => {
    const request = buildOpenRouterRequest(contextJson, maximumOutputTokens);
    const context = JSON.parse(request.messages[1].content) as { listings: { listingId: string }[] };
    const ids = context.listings.map(row => row.listingId);
    const body = { model: request.model, messages: request.messages, stream: false as const,
      max_completion_tokens: request.maximumOutputTokens,
      response_format: { type: 'json_schema' as const, json_schema: { name: 'research_interpretation_v1', strict: true,
        schema: { type: 'object', additionalProperties: false, required: ['schemaVersion', 'interpretations'],
          properties: { schemaVersion: { type: 'string', const: OPENROUTER_PROJECTION_VERSION },
            interpretations: { type: 'array', minItems: 1, maxItems: ids.length,
              items: { type: 'object', additionalProperties: false, required: ['listingId', 'interpretation'],
                properties: { listingId: { type: 'string', enum: ids },
                  interpretation: { type: 'string', minLength: 1, maxLength: 2000 } } } } } } } },
      // Policy choice, not a claim that model pinning alone fixes an upstream deployment.
      provider: { only: ['google-ai-studio'], allow_fallbacks: false, require_parameters: true } };
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_OPENROUTER_INPUT_BYTES) block('SIZE_LIMIT');
    return freeze({ ...WIRE_DRAFT_SAFETY, body, estimatedInputTokens: request.estimatedInputTokens,
      routingPolicyVerified: false as const });
  });
}

export function mapOpenRouterWireDraft(rawJson: unknown, contextJson: unknown, generatedAt: unknown, maximumOutputTokens?: unknown) {
  return guarded('INVALID_RESPONSE', () => {
    const draft = buildOpenRouterWireDraft(contextJson, maximumOutputTokens);
    const raw = json(rawJson, MAX_OPENROUTER_RESPONSE_BYTES);
    const envelope = object(raw, ['id', 'object', 'created', 'model', 'choices', 'usage', 'error']);
    if (Object.hasOwn(envelope, 'error')) block('PROVIDER_ERROR');
    const responseId = text(envelope.id, 128);
    if (!/^(gen|chatcmpl)-[A-Za-z0-9_-]+$/.test(responseId) || envelope.object !== 'chat.completion' ||
        envelope.model !== draft.body.model) reject();
    integer(envelope.created, 8640000000000);
    if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1) reject();
    const choice = object(envelope.choices[0], ['index', 'finish_reason', 'native_finish_reason', 'message', 'error']);
    if (Object.hasOwn(choice, 'error')) block('PROVIDER_ERROR');
    if (choice.index !== 0) reject();
    if (choice.finish_reason !== 'stop') block('BLOCKED_OUTCOME');
    if (choice.native_finish_reason !== undefined && choice.native_finish_reason !== null) text(choice.native_finish_reason, 100);
    const message = object(choice.message, ['role', 'content', 'refusal']);
    if (message.refusal !== undefined && message.refusal !== null) block('BLOCKED_OUTCOME');
    if (message.role !== 'assistant' || typeof message.content !== 'string') reject();
    const content = object(json(message.content, MAX_OPENROUTER_RESPONSE_BYTES), ['schemaVersion', 'interpretations']);
    if (content.schemaVersion !== OPENROUTER_PROJECTION_VERSION || !Array.isArray(content.interpretations) ||
        content.interpretations.length < 1) reject();
    const usage = object(envelope.usage, ['prompt_tokens', 'completion_tokens', 'total_tokens']);
    const inputTokens = integer(usage.prompt_tokens, MAX_OPENROUTER_INPUT_TOKENS);
    const outputTokens = integer(usage.completion_tokens, draft.body.max_completion_tokens);
    if (integer(usage.total_tokens, MAX_OPENROUTER_INPUT_TOKENS + draft.body.max_completion_tokens) !== inputTokens + outputTokens) reject();
    const projection = validateOpenRouterResponse(JSON.stringify({ ...content, model: envelope.model,
      finishReason: 'stop', usage: { inputTokens, outputTokens } }), contextJson, generatedAt, draft.body.max_completion_tokens);
    return freeze({ ...WIRE_DRAFT_SAFETY, outcome: 'validated_fixture' as const, responseId, projection });
  });
}
