import { generateToken } from './generate_token_worker.js';

const RTL_EMBED = '\u202b';
const POP_DIRECTIONAL = '\u202c';
const HEBREW_VALUE_RE = /"([^"\n]*[\u0590-\u05FF][^"\n]*)"/g;

function wrapHebrewJsonValues(jsonStr) {
  return jsonStr.replace(HEBREW_VALUE_RE, (_match, value) => `"${RTL_EMBED}${value}${POP_DIRECTIONAL}"`);
}

function jsonResponse(data, status = 200) {
  const jsonStr = JSON.stringify(data, null, 2);
  const wrappedJson = wrapHebrewJsonValues(jsonStr);
  return new Response(wrappedJson, {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  });
}

function normalizeTokenType(tokenType) {
  if (tokenType == null) {
    throw new Error('Missing TOKEN_TYPE');
  }

  const num = Number(tokenType);
  if (!Number.isNaN(num)) {
    if (num === 0) return 'SMS';
    if (num === 1) return 'PRIMARY';
    if (num === 2) return 'SECONDARY';
  }

  const normalized = String(tokenType).trim().toUpperCase();
  if (normalized === 'SMS' || normalized === 'PRIMARY' || normalized === 'SECONDARY') {
    return normalized;
  }

  throw new Error(`Invalid TOKEN_TYPE: ${tokenType}`);
}

function authHeaders(token) {
  return {
    'User-Agent': 'okhttp/4.9.3',
    'X-Bt-Token': token,
    'Content-Type': 'application/json',
  };
}

async function validateResponse(response) {
  const data = await response.json();
  if (!response.ok || data.err || data.status !== 'ok') {
    throw new Error(`Request failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function checkToken(token) {
  const ts = Math.floor(Date.now() / 1000);
  const response = await fetch(`https://api1.pal-es.com/v1/bt/user/check-token?ts=${ts}&ts_diff=0`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  return validateResponse(response);
}

async function getPalgateDeviceList(token) {
  const response = await fetch('https://api1.pal-es.com/v1/bt/devices', {
    method: 'GET',
    headers: authHeaders(token),
  });

  const devicesData = await validateResponse(response);
  return (devicesData.devices || []).map((device) => ({
    id: device.id,
    address: device.address,
    name: device.name,
    name1: device.name1,
  }));
}

async function parseRequest(request) {
  const url = new URL(request.url);
  const result = {
    phoneNumber: url.searchParams.get('phoneNumber'),
    sessionToken: url.searchParams.get('sessionToken'),
    tokenType: url.searchParams.get('tokenType') || '1',
  };

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (body) {
        if (body.phoneNumber) result.phoneNumber = body.phoneNumber;
        if (body.sessionToken) result.sessionToken = body.sessionToken;
        if (body.tokenType) result.tokenType = body.tokenType;
      }
    }
  }

  return result;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const params = await parseRequest(request);
      const phoneNumber = params.phoneNumber || env.PALGATE_PHONE_NUMBER;
      const sessionToken = params.sessionToken || env.PALGATE_SESSION_TOKEN;
      const tokenType = normalizeTokenType(params.tokenType);

      if (!phoneNumber) {
        return jsonResponse({ error: 'Missing phoneNumber (query param or env PALGATE_PHONE_NUMBER)' }, 400);
      }
      if (!sessionToken) {
        return jsonResponse({ error: 'Missing sessionToken (query param or env PALGATE_SESSION_TOKEN)' }, 400);
      }

      const derivedToken = generateToken(sessionToken, phoneNumber, tokenType, {
        timestampMs: Math.floor(Date.now() / 1000),
      });

      const tokenCheck = await checkToken(derivedToken);
      const devices = await getPalgateDeviceList(derivedToken);

      return jsonResponse({
        tokenCheck,
        devices,
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
  }
};
