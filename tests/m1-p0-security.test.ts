import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApiApp } from '../server';
import {
  createSupabaseAccessTokenVerifier,
  isLiveScrapingEnabled
} from '../src/server/m1Security';
import {
  analyzeEtsyMarket,
  fetchApifyListings
} from '../src/services/analyzer';
import { hasValidSupabaseConfiguration } from '../src/security/supabaseConfiguration';
import { canAccessPrivateWorkspace } from '../src/security/workspaceAccess';

interface TestResponse {
  status: number;
  body: { error?: string };
}

async function postAnalyze(
  authorization: string | undefined,
  verifyAccessToken: (token: string) => Promise<{ id: string } | null>
): Promise<TestResponse> {
  const app = createApiApp({ verifyAccessToken });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    return await new Promise<TestResponse>((resolve, reject) => {
      const request = http.request(
        {
          host: '127.0.0.1',
          port,
          path: '/api/analyze-etsy',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(authorization ? { authorization } : {})
          }
        },
        (response) => {
          let rawBody = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            rawBody += chunk;
          });
          response.on('end', () => {
            resolve({
              status: response.statusCode ?? 0,
              body: JSON.parse(rawBody)
            });
          });
        }
      );

      request.on('error', reject);
      request.end(JSON.stringify({ keyword: 'wall art', pages: 1 }));
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('analysis endpoint rejects a missing bearer token', async () => {
  let verifierCalled = false;
  const response = await postAnalyze(undefined, async () => {
    verifierCalled = true;
    return { id: 'unexpected' };
  });

  assert.equal(response.status, 401);
  assert.equal(verifierCalled, false);
});

test('analysis endpoint rejects invalid, expired, or unverifiable tokens', async () => {
  const invalidResponse = await postAnalyze('Bearer invalid-token', async () => null);
  const unverifiableResponse = await postAnalyze('Bearer unverifiable-token', async () => {
    throw new Error('verification unavailable');
  });

  assert.equal(invalidResponse.status, 401);
  assert.equal(unverifiableResponse.status, 401);
});

test('authenticated analysis remains unavailable and does not consume credits', async () => {
  const response = await postAnalyze('Bearer valid-token', async () => ({ id: 'user-123' }));

  assert.equal(response.status, 503);
  assert.match(response.body.error ?? '', /unavailable/i);
});

test('missing Supabase configuration fails closed without network verification', async () => {
  assert.equal(hasValidSupabaseConfiguration(undefined, undefined), false);
  assert.equal(
    hasValidSupabaseConfiguration('https://your-project.supabase.co', 'your-anon-key'),
    false
  );

  const verifier = createSupabaseAccessTokenVerifier({});
  assert.equal(await verifier('any-token'), null);

  const response = await postAnalyze('Bearer any-token', verifier);
  assert.equal(response.status, 401);
});

test('live scraping is enabled only by the exact server value true', () => {
  assert.equal(isLiveScrapingEnabled(undefined), false);
  assert.equal(isLiveScrapingEnabled('false'), false);
  assert.equal(isLiveScrapingEnabled('TRUE'), false);
  assert.equal(isLiveScrapingEnabled(' true '), false);
  assert.equal(isLiveScrapingEnabled('true'), true);
});

test('M1 never invokes paid providers in either scraping flag state', async () => {
  const originalFetch = globalThis.fetch;
  let outboundCalls = 0;
  globalThis.fetch = (async () => {
    outboundCalls += 1;
    throw new Error('paid provider invocation detected');
  }) as typeof fetch;

  try {
    for (const flag of ['false', 'true']) {
      const result = await fetchApifyListings('wall art', {
        enabled: isLiveScrapingEnabled(flag),
        token: 'server-token-must-not-be-used-in-m1'
      });
      assert.equal(result.isLive, false);
    }

    await assert.rejects(
      analyzeEtsyMarket('wall art', [], false),
      /unavailable during M1 security hardening/i
    );
    assert.equal(outboundCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public demo state never grants private workspace access', () => {
  const user = { id: 'user-123' };
  const workspace = { id: 'workspace-123' };

  assert.equal(
    canAccessPrivateWorkspace({ isSupabaseConfigured: false, user, workspace }),
    false
  );
  assert.equal(
    canAccessPrivateWorkspace({ isSupabaseConfigured: true, user: null, workspace }),
    false
  );
  assert.equal(
    canAccessPrivateWorkspace({ isSupabaseConfigured: true, user, workspace: null }),
    false
  );
  assert.equal(
    canAccessPrivateWorkspace({ isSupabaseConfigured: true, user, workspace }),
    true
  );
});
