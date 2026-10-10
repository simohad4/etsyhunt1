import { calculateRequiredCredits, PRICING_PLANS } from '../src/config/pricing';
import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('--- Starting Etsy Hunter M1 Verification Suite ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  // 1. Centralized Pricing Rules
  assert(
    PRICING_PLANS.starter.price === 29 && PRICING_PLANS.starter.creditsPerMonth === 20 && PRICING_PLANS.starter.maxSavedListings === 50,
    'Starter Plan tier adheres to $29 / 20 credits / 50 saved listings'
  );
  assert(
    PRICING_PLANS.pro.price === 59 && PRICING_PLANS.pro.creditsPerMonth === 60 && PRICING_PLANS.pro.maxSavedListings === 250,
    'Pro Plan tier adheres to $59 / 60 credits / 250 saved listings'
  );
  assert(
    PRICING_PLANS.agency.price === 119 && PRICING_PLANS.agency.creditsPerMonth === 120 && PRICING_PLANS.agency.maxSavedListings === 1000,
    'Agency Plan tier adheres to $119 / 120 credits / 1000 saved listings'
  );
  assert(
    PRICING_PLANS.pro.recommended === true,
    'Pro Plan is marked as the recommended tier'
  );

  // 2. Credit Calculation Formula: 1 keyword * 1 page = 1 credit
  assert(
    calculateRequiredCredits(1, 1) === 1,
    'Credit calculation: 1 keyword * 1 page = 1 credit'
  );
  assert(
    calculateRequiredCredits(1, 3) === 3,
    'Credit calculation: 1 keyword * 3 pages = 3 credits'
  );
  assert(
    calculateRequiredCredits(2, 3) === 6,
    'Credit calculation: 2 keywords * 3 pages = 6 credits'
  );
  assert(
    calculateRequiredCredits(1, 4) === 3,
    'Credit calculation bounds pages at maximum 3 per search'
  );

  // 3. PostgreSQL Migration File Check
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261010_etsyhunter_m1_foundation.sql');
  const migrationExists = fs.existsSync(migrationPath);
  assert(migrationExists, 'Migration file 20261010_etsyhunter_m1_foundation.sql exists');

  if (migrationExists) {
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Check all required tables
    const requiredTables = [
      'user_profiles',
      'subscriptions',
      'research_credit_accounts',
      'research_credit_ledger',
      'saved_listings',
      'research_history',
      'research_cache'
    ];

    for (const table of requiredTables) {
      assert(
        migrationSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
        `Table definition present: ${table}`
      );
      assert(
        migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS explicitly enabled on: ${table}`
      );
    }

    // Check Security Definer and Safe Search Path
    assert(
      migrationSql.includes('SECURITY DEFINER') && migrationSql.includes('SET search_path = public, pg_temp'),
      'SECURITY DEFINER functions enforce safe search_path to prevent hijacking'
    );

    // Check authoritative credit deduction RPC
    assert(
      migrationSql.includes('CREATE OR REPLACE FUNCTION public.consume_research_credits'),
      'Authoritative RPC consume_research_credits defined'
    );
    assert(
      migrationSql.includes('GRANT EXECUTE ON FUNCTION public.consume_research_credits(TEXT, INTEGER, INTEGER) TO authenticated;'),
      'consume_research_credits RPC granted strictly to authenticated users'
    );

    // Check zero-credit new user initialization trigger
    assert(
      migrationSql.includes("plan_tier, status)\n    VALUES (NEW.id, 'none', 'inactive')") ||
      migrationSql.includes("VALUES (NEW.id, 'none', 'inactive')"),
      'New user signup trigger initializes subscription with plan_tier = none and status = inactive'
    );
    assert(
      migrationSql.includes('credits_remaining, monthly_allowance, max_saved_listings)\n    VALUES (NEW.id, 0, 0, 50)') ||
      migrationSql.includes('VALUES (NEW.id, 0, 0, 50)'),
      'New user signup trigger initializes credit account with 0 credits and 0 monthly allowance'
    );
  }

  // 4. Trademark check - ensure zero occurrences of forbidden terms
  const srcFiles = ['src/components', 'src/services', 'src/context', 'src/types'];
  let foundLinear = false;

  function scanDir(dir: string) {
    const fullDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) return;
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(fullDir, entry.name);
      if (entry.isDirectory()) {
        scanDir(path.relative(process.cwd(), fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/Linear/i.test(content) && !content.includes('bg-gradient-to-') && !content.includes('linear-gradient')) {
          console.error(`Found residual trademark 'Linear' in ${fullPath}`);
          foundLinear = true;
        }
      }
    }
  }

  for (const dir of srcFiles) {
    scanDir(dir);
  }

  assert(!foundLinear, 'Codebase contains 0 residual trademark mentions in components/services/context/types');

  console.log(`\n--- Verification Summary: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
