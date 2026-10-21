/** SendGrid integration (stub): records each recovery email in email_logs. */
const { getSupabase, unwrap } = require('../supabaseClient');
const { logger } = require('../middleware/logger');

async function logEmail({ cart_id, to, template_name, subject }) {
  console.log(`[sendgrid:stub] "${subject}" -> ${to} (template ${template_name})`);
  if (process.env.SENDGRID_API_KEY) logger.warn('sendgrid.live_not_implemented', { cart_id });
  const row = unwrap(
    await getSupabase().from('email_logs').insert({ cart_id, template_name, subject }).select().single(),
    'insert email log'
  );
  logger.info('sendgrid.email_logged', { email_id: row.id, cart_id, template_name });
  return row;
}

module.exports = { logEmail };
