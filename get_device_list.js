#!/usr/bin/env node

import { generateToken } from './generate_token_worker.js';

const RTL_EMBED = '\u202b';
const POP_DIRECTIONAL = '\u202c';
const HEBREW_VALUE_RE = /"([^"\n]*[\u0590-\u05FF][^"\n]*)"/g;

function wrapHebrewJsonValues(jsonStr) {
  return jsonStr.replace(HEBREW_VALUE_RE, (_match, value) => `"${RTL_EMBED}${value}${POP_DIRECTIONAL}"`);
}

function prettyPrint(data) {
  const jsonStr = JSON.stringify(data, null, 2);
  console.log(wrapHebrewJsonValues(jsonStr));
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

function normalizeTokenType(tokenType) {
  if (tokenType == null) {
    throw new Error('Missing TOKEN_TYPE environment variable');
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
    throw new Error(`Request failed. Full response: ${JSON.stringify(data)}`);
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

async function main() {
  const phoneNumber = getEnv('PHONE_NUMBER');
  const sessionToken = getEnv('SESSION_TOKEN');
  const tokenType = normalizeTokenType(getEnv('TOKEN_TYPE'));

  console.log('Checking token...');

  const derivedToken = generateToken(sessionToken, phoneNumber, tokenType, {
    timestampMs: Math.floor(Date.now() / 1000),
  });

  const tokenCheck = await checkToken(derivedToken);
  prettyPrint(tokenCheck);

  console.log('\nGet all gates info...');
  const devices = await getPalgateDeviceList(derivedToken);
  prettyPrint(devices);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
