function aiErrorStatus(err) {
  if (err?.statusCode) return err.statusCode;
  if (err?.message?.includes('GROQ_API_KEY')) return 503;
  return 500;
}

function aiErrorPayload(err) {
  const status = aiErrorStatus(err);
  const body = {
    error: err?.message || 'AI request failed',
    code: err?.isRateLimit ? 'groq_rate_limit' : undefined
  };
  if (err?.retryAfterSec) body.retryAfterSec = err.retryAfterSec;
  if (status === 429) {
    body.hint =
      'Free Groq tier has a daily token cap. Wait and retry, or set GROQ_FALLBACK_MODEL=llama-3.1-8b-instant in server/.env.';
  }
  return { status, body };
}

module.exports = { aiErrorStatus, aiErrorPayload };
