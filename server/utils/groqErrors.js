/**
 * Parse Groq SDK / API errors into user-friendly messages.
 */
function parseRetryAfter(message) {
  if (!message) return null;
  const m = String(message).match(/try again in (\d+)m([\d.]+)s/i);
  if (m) return Math.ceil(Number(m[1]) * 60 + Number(m[2]));
  const s = String(message).match(/try again in ([\d.]+)s/i);
  if (s) return Math.ceil(Number(s[1]));
  return null;
}

function extractGroqMessage(error) {
  if (!error) return 'Unknown Groq error';
  if (typeof error === 'string') return error;

  const raw = error.message || error.error?.message || '';
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const j = JSON.parse(raw);
      return j?.error?.message || j?.message || raw;
    } catch {
      return raw;
    }
  }
  if (typeof raw === 'object' && raw?.message) return raw.message;
  return String(raw || error);
}

function parseGroqError(error) {
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  const apiMessage = extractGroqMessage(error);
  const isRateLimit =
    status === 429 ||
    /rate_limit|rate limit|tokens per day|TPD|quota/i.test(apiMessage);

  const retryAfterSec = parseRetryAfter(apiMessage);

  let userMessage = apiMessage;
  if (isRateLimit) {
    if (retryAfterSec) {
      const mins = Math.ceil(retryAfterSec / 60);
      userMessage = `Groq daily token limit reached. Wait about ${mins} minute${mins === 1 ? '' : 's'} and try again, or switch to a smaller model in server/.env (see GROQ_FALLBACK_MODEL).`;
    } else {
      userMessage =
        'Groq rate limit reached. Wait a few minutes and try again, or set GROQ_FALLBACK_MODEL=llama-3.1-8b-instant in server/.env.';
    }
  }

  return {
    statusCode: isRateLimit ? 429 : status || 500,
    userMessage,
    apiMessage,
    isRateLimit,
    retryAfterSec
  };
}

function toGroqHttpError(error) {
  const parsed = parseGroqError(error);
  const err = new Error(parsed.userMessage);
  err.statusCode = parsed.statusCode;
  err.isRateLimit = parsed.isRateLimit;
  err.retryAfterSec = parsed.retryAfterSec;
  err.apiMessage = parsed.apiMessage;
  return err;
}

module.exports = { parseGroqError, toGroqHttpError, parseRetryAfter };
