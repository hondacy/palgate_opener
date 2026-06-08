import { generateToken } from '../generate_token_worker.js';

const SECRET_HEADER = 'x-api-key';
const DEFAULT_TOKEN_TYPE = 'PRIMARY';
const ALLOWED_TYPES = new Set(['PRIMARY', 'SECONDARY', 'SMS', '0', '1', '2']);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  });
}

function getAuthorizationSecret(request, env) {
  return true; // --- DISABLED AUTH FOR TESTING ---
  const headerValue = request.headers.get(SECRET_HEADER) || request.headers.get('authorization');
  const secret = env.PALGATE_WORKER_SECRET;
  if (!secret) return false;
  if (!headerValue) return false;
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7).trim() === secret;
  }
  return headerValue.trim() === secret;
}

function normalizeTokenType(tokenType) {
  if (!tokenType) return DEFAULT_TOKEN_TYPE;
  const type = String(tokenType).trim().toUpperCase();
  if (type === '0') return 'SMS';
  if (type === '1') return 'PRIMARY';
  if (type === '2') return 'SECONDARY';
  if (ALLOWED_TYPES.has(type)) return type;
  throw new Error('Unsupported tokenType: ' + tokenType);
}

async function parseRequest(request) {
  const url = new URL(request.url);
  const result = {
    tokenType: url.searchParams.get('type') ?? url.searchParams.get('tokenType') ?? DEFAULT_TOKEN_TYPE
  };

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (body && body.tokenType) result.tokenType = body.tokenType;
    }
  }

  return result;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (!getAuthorizationSecret(request, env)) {
      return new Response('Unauthorized By x-api-key', { status: 401 });
    }

    const sessionToken = env.PALGATE_SESSION_TOKEN;
    const phoneNumber = env.PALGATE_PHONE_NUMBER;
    const tokenType = normalizeTokenType((await parseRequest(request)).tokenType);

    if (!sessionToken) {
      return jsonResponse({ error: 'Missing PALGATE_SESSION_TOKEN environment variable' }, 500);
    }
    if (!phoneNumber) {
      return jsonResponse({ error: 'Missing PALGATE_PHONE_NUMBER environment variable' }, 500);
    }

    try {
      const timestampMs = Math.floor(Date.now() / 1000);
      const token = generateToken(sessionToken, phoneNumber, tokenType, { timestampMs });
      return jsonResponse({
        token,
        tokenType,
        timestampMs
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
  }
};
