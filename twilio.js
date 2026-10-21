/**
 * Twilio integration (stub): persists call logs and "sends" SMS.
 * Real telephony hook-up (click-to-call, recording webhooks) is in the roadmap.
 */
const { getSupabase, unwrap } = require('../supabaseClient');
const { logger } = require('../middleware/logger');

async function logCall({ cart_id, rep_id, duration_seconds, outcome, notes, recording_url }) {
  console.log(`[twilio:stub] call logged cart=${cart_id} rep=${rep_id} outcome=${outcome} ${duration_seconds || 0}s`);
  const row = unwrap(
    await getSupabase()
      .from('call_logs')
      .insert({ cart_id, rep_id, duration_seconds, outcome, notes, recording_url })
      .select()
      .single(),
    'insert call log'
  );
  logger.info('twilio.call_logged', { call_id: row.id, cart_id, rep_id, outcome });
  return row;
}

/** SMS is recorded in call_logs (outcome 'sms_sent') so reps see the full timeline. */
async function sendSms({ cart_id, to, message }) {
  console.log(`[twilio:stub] SMS to ${to}: ${message}`);
  const row = unwrap(
    await getSupabase()
      .from('call_logs')
      .insert({ cart_id, rep_id: null, duration_seconds: 0, outcome: 'sms_sent', notes: message })
      .select()
      .single(),
    'insert sms log'
  );
  logger.info('twilio.sms_sent', { log_id: row.id, cart_id, live: Boolean(process.env.TWILIO_SID) });
  return row;
}

module.exports = { logCall, sendSms };
