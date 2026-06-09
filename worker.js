import { generateToken as generatePalgateToken } from "./generate_token_worker.js";

/**
 * Cloudflare Worker for Palgate Gate Opener
 * 
 * Environment Variables Required:
 * - PALGATE_PHONE_NUMBER: Your phone number (as string, e.g., "972521234567")
 * - PALGATE_SESSION_TOKEN: Session token as hex string (16 bytes, e.g., "6b3fa357sc67f3fa357sc67fa4")
 * - PALGATE_TOKEN_TYPE: Token type (PRIMARY / SECONDARY / SMS, or 1 / 2 / 0)
 * - PALGATE_DEVICE_ID: Gate device ID (e.g., "4G600123456")
 */

const ANDROID_USER_AGENT = "okhttp/4.9.3";
const BASE_URL = "https://api1.pal-es.com/v1/";

function normalizeTokenType(tokenType) {
  if (tokenType === undefined || tokenType === null || tokenType === "") {
    return "PRIMARY";
  }
  const type = String(tokenType).trim().toUpperCase();
  if (type === "0" || type === "SMS") return "SMS";
  if (type === "1" || type === "PRIMARY") return "PRIMARY";
  if (type === "2" || type === "SECONDARY") return "SECONDARY";
  throw new Error(`Unsupported PALGATE_TOKEN_TYPE: ${tokenType}`);
}

/**
 * Get authenticated request headers
 */
function getAuthenticatedHeaders(env) {
  const sessionTokenHex = env.PALGATE_SESSION_TOKEN || env.SESSION_TOKEN;
  const phoneNumber = env.PALGATE_PHONE_NUMBER || env.PHONE_NUMBER;
  const tokenType = normalizeTokenType(env.PALGATE_TOKEN_TYPE ?? env.TOKEN_TYPE);

  // DEBUG:
  //console.log("Session Token (hex):", sessionTokenHex);
  console.log("Phone Number:", phoneNumber);
  console.log("Token Type:", tokenType);
  
  if (!sessionTokenHex) {
    throw new Error('Missing PALGATE_SESSION_TOKEN or SESSION_TOKEN environment variable');
  }
  if (!phoneNumber) {
    throw new Error('Missing PALGATE_PHONE_NUMBER or PHONE_NUMBER environment variable');
  }

  const derivedToken = generatePalgateToken(
    sessionTokenHex,
    phoneNumber,
    tokenType
  );

  return {
    "User-Agent": ANDROID_USER_AGENT,
    "X-Bt-Token": derivedToken,
    "Content-Type": "application/json"
  };
}

/**
 * Validate API response
 */
function validateResponse(responseData) {
  if (responseData.err || responseData.status !== "ok") {
    throw new Error(
      `Request failed. Full response: ${JSON.stringify(responseData)}`
    );
  }
  return responseData;
}

/**
 * Check if token is valid
 */
async function checkToken(env) {
  const headers = await getAuthenticatedHeaders(env);
  const ts = Math.floor(Date.now() / 1000);
  
  // DEBUG:
  console.log("headers:", headers);
 
  const response = await fetch(
    `${BASE_URL}bt/user/check-token?ts=${ts}&ts_diff=0`,
    { headers }
  );

  const data = await response.json();
  return validateResponse(data);
}

/**
 * Open the gate
 */
async function openGate(env, deviceId) {
  const headers = await getAuthenticatedHeaders(env);
  
  const response = await fetch(
    `${BASE_URL}bt/device/${deviceId}/open-gate?openBy=100&outputNum=1`,
    { headers }
  );

  const data = await response.json();
  return validateResponse(data);
}

/**
 * Get list of devices
 */
async function getPalgateDeviceList(env) {
  const headers = await getAuthenticatedHeaders(env);
  
  const response = await fetch(
    `${BASE_URL}bt/devices`,
    { headers }
  );

  const data = await response.json();
  const devices = validateResponse(data);
  
  return devices.devices.map(device => ({
    id: device.id,
    address: device.address,
    name: device.name,
    name1: device.name1
  }));
}

/**
 * Main Cloudflare Worker handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Route: GET /open-gate?deviceId=DEVICE_ID
      if (pathname === "/open-gate") {
        const deviceId = url.searchParams.get("deviceId") || env.PALGATE_DEVICE_ID;
        if (!deviceId) {
          return new Response(
            JSON.stringify({ error: "Missing deviceId parameter" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        console.log("Checking token...");
        await checkToken(env);
        
        console.log("Opening gate...");
        const result = await openGate(env, deviceId);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Route: GET /devices
      if (pathname === "/devices") {
        const devices = await getPalgateDeviceList(env);
        return new Response(
          JSON.stringify({ devices }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Route: GET /check-token
      if (pathname === "/check-token") {
        const result = await checkToken(env);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Root route - instructions
      if (pathname === "/") {
        return new Response(`
          <html>
            <body style="font-family: monospace; padding: 20px;">
              <h1>Palgate Gate Opener - Cloudflare Worker</h1>
              <h2>Available Routes:</h2>
              <ul>
                <li><strong>GET /open-gate</strong> - Open gate (uses DEVICE_ID from env or ?deviceId query param)</li>
                <li><strong>GET /devices</strong> - List all devices</li>
                <li><strong>GET /check-token</strong> - Verify token is valid</li>
              </ul>
              <h2>Examples:</h2>
              <ul>
                <li><a href="/open-gate">/open-gate</a></li>
                <li><a href="/open-gate?deviceId=4G600123456">/open-gate?deviceId=4G600123456</a></li>
                <li><a href="/devices">/devices</a></li>
                <li><a href="/check-token">/check-token</a></li>
              </ul>
            </body>
          </html>
        `, { 
          headers: { "Content-Type": "text/html" }
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
