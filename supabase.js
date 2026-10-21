/**
 * Supabase client (PostgreSQL access layer).
 *
 * Key selection:
 *  - SUPABASE_SERVICE_ROLE_KEY (preferred for a trusted backend; bypasses RLS)
 *  - SUPABASE_ANON_KEY (fallback). NOTE: the schema enables RLS with no public
 *    policies, so the anon key alone will be denied. We warn loudly if that's
 *    the only key configured.
 *
 * The client is created lazily so the app (and tests) can boot without
 * credentials, and so a misconfiguration surfaces as a clear 500 + log line.
 */
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('./middleware/logger');

let client = null;

function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  }
  if (!serviceKey) {
    logger.warn('supabase.anon_key_only', {
      hint: 'RLS is enabled with no policies; queries will return no rows. Set SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/**
 * Unwraps a supabase-js response. Throws a DbError (logged) if it failed so
 * route handlers never silently swallow a database problem.
 */
function unwrap({ data, error }, context) {
  if (error) {
    const err = new Error(`Database error during ${context}: ${error.message}`);
    err.status = 500;
    err.code = error.code;
    logger.error('db.error', { context, code: error.code, message: error.message });
    throw err;
  }
  return data;
}

module.exports = { getSupabase, unwrap };
