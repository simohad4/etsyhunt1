import { planResearchExecution, type OfflineResearchPlan } from './researchExecutionPlan';
import { validateApifyResponse } from './providers/apifyAdapter';
import { validateOpenRouterResponse } from './providers/openrouterAdapter';
import { freeze, object, reject } from './providers/adapterContract';

export type ResearchCandidateStage = 'apify' | 'openrouter' | 'completion_review' | 'none';
type ApifyProjection = ReturnType<typeof validateApifyResponse>;
type OpenRouterProjection = ReturnType<typeof validateOpenRouterResponse>;
export interface OfflineResearchSimulation extends OfflineResearchPlan {
  readonly candidateNextStage: ResearchCandidateStage;
  readonly fixtureValidation: 'not_supplied' | 'validated' | 'invalid';
  readonly fixtureTrust: 'synthetic_unverified';
  readonly fixtures: Readonly<{
    apify: ApifyProjection | null;
    openrouter: OpenRouterProjection | null;
  }>;
}

function candidate(plan: OfflineResearchPlan): ResearchCandidateStage {
  // Inspect classification as well as status: last-known status on an unknown
  // transport outcome must never become a candidate provider stage.
  if ((plan.classification === 'new_reservation' || plan.classification === 'existing_reservation') &&
      plan.databaseStatus === 'reserved') return 'apify';
  if (plan.classification === 'stage_complete' && plan.databaseStatus === 'apify_complete') return 'openrouter';
  if (plan.classification === 'stage_complete' && plan.databaseStatus === 'openrouter_complete') return 'completion_review';
  return 'none';
}

/** Stateless simulation only. Raw observations are always revalidated by M4.1.
 * Fixtures use existing application-owned projections, never live wire schemas.
 * No fixture, reservation or candidate is an admission or completion decision.
 */
export function simulateResearchOrchestration(observation: unknown, fixtureInput?: unknown): OfflineResearchSimulation {
  const plan = planResearchExecution(observation);
  let fixtureValidation: OfflineResearchSimulation['fixtureValidation'] = 'not_supplied';
  let apify: ApifyProjection | null = null;
  let openrouter: OpenRouterProjection | null = null;
  if (fixtureInput !== undefined) {
    try {
      const fixtures = object(fixtureInput, ['apify', 'openrouter']);
      // A model fixture requires validated listing evidence; callers cannot
      // inject an unrelated model context or claim an admitted attempt.
      if (!Object.hasOwn(fixtures, 'apify')) reject();
      const a = object(fixtures.apify, ['responseJson', 'request', 'collectedAt']);
      apify = validateApifyResponse(a.responseJson, a.request, a.collectedAt);
      if (Object.hasOwn(fixtures, 'openrouter')) {
        const o = object(fixtures.openrouter, ['responseJson', 'generatedAt', 'maximumOutputTokens']);
        const contextJson = JSON.stringify({ listings: apify.listings.map(listing => ({
          listingId: listing.id, title: listing.title.value
        })) });
        openrouter = validateOpenRouterResponse(o.responseJson, contextJson, o.generatedAt, o.maximumOutputTokens);
      }
      fixtureValidation = 'validated';
    } catch {
      // Atomic fixture rejection: no partial evidence or raw error/payload leaks.
      fixtureValidation = 'invalid';
      apify = null;
      openrouter = null;
    }
  }
  return freeze({ ...plan,
    candidateNextStage: fixtureValidation === 'invalid' ? 'none' : candidate(plan),
    fixtureValidation, fixtureTrust: 'synthetic_unverified' as const,
    fixtures: { apify, openrouter }
  });
}
