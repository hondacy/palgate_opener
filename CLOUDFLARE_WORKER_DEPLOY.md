# Cloudflare Worker Deployment

This project is already configured as a Cloudflare Worker application using these files:

- `package.json`
- `wrangler.toml`
- `src/index.js`
- `generate_token_worker.js`

## Prerequisites

- Node.js 18+ installed
- `npm` available
- Cloudflare account
- Cloudflare API token with Worker deployment permissions

## Install dependencies

```bash
cd /Users/hanochdaum/development/palgate_opener
npm install
```

## Local development

Start the worker locally with Wrangler:

```bash
npm run dev
```

Then call the local endpoint, for example:

```bash
curl "http://127.0.0.1:8787/?type=PRIMARY" \
  -H "x-api-key: your-secret"
```

## Environment variables

The worker expects these environment values to be configured as secrets:

- `PALGATE_WORKER_SECRET`
- `PALGATE_SESSION_TOKEN`
- `PALGATE_PHONE_NUMBER`

### Set secrets using Wrangler

```bash
npx wrangler secret put PALGATE_WORKER_SECRET
npx wrangler secret put PALGATE_SESSION_TOKEN
npx wrangler secret put PALGATE_PHONE_NUMBER
```

## Deploy as a new Cloudflare Worker

1. Log in to Cloudflare using Wrangler:

```bash
npx wrangler login
```

2. Add your Cloudflare `account_id` to `wrangler.toml` if required:

```toml
name = "palgate-opener-token-worker"
account_id = "YOUR_ACCOUNT_ID"
main = "src/index.js"
compatibility_date = "2026-01-01"

[build]
upload.format = "modules"
```

3. Deploy the worker:

```bash
npm run deploy
```

## Example request after deploy

```bash
curl "https://palgate-opener-token-worker.YOUR_WORKERS_SUBDOMAIN.workers.dev/?type=SMS" \
  -H "x-api-key: your-secret"
```

## Notes

- `PALGATE_WORKER_SECRET` is a custom secret used by the worker for request authentication.
- The worker returns a generated Palgate token only when the request is authorized.
- If you want to use `Authorization: Bearer ...`, the worker supports that header too.
