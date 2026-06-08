import json
import os
from urllib.parse import parse_qs
from wsgiref.simple_server import make_server

import helpers

WEBHOOK_TOKEN = os.getenv("WEBHOOK_TOKEN")
PORT = int(os.getenv("PORT", "8000"))


def json_response(body: dict, status: int = 200) -> tuple[bytes, list[tuple[str, str]], int]:
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(payload))),
    ]
    return payload, headers, status


def application(environ, start_response):
    if environ["REQUEST_METHOD"] != "GET":
        payload, headers, status = json_response({"error": "Use GET"}, 405)
        start_response(f"{status} Method Not Allowed", headers)
        return [payload]

    query = parse_qs(environ.get("QUERY_STRING", ""))
    token = query.get("token", [None])[0]
    device_id = query.get("device_id", [None])[0]

    if WEBHOOK_TOKEN is None:
        payload, headers, status = json_response({"error": "Server not configured: WEBHOOK_TOKEN missing"}, 500)
        start_response(f"{status} Internal Server Error", headers)
        return [payload]

    if token != WEBHOOK_TOKEN:
        payload, headers, status = json_response({"error": "Unauthorized"}, 401)
        start_response(f"{status} Unauthorized", headers)
        return [payload]

    if not device_id:
        payload, headers, status = json_response({"error": "Missing device_id"}, 400)
        start_response(f"{status} Bad Request", headers)
        return [payload]

    try:
        result = helpers.open_gate(device_id)
    except Exception as exc:
        payload, headers, status = json_response({"error": "open_gate failed", "details": str(exc)}, 500)
        start_response(f"{status} Internal Server Error", headers)
        return [payload]

    payload, headers, status = json_response({"status": "ok", "device_id": device_id, "result": result})
    start_response(f"{status} OK", headers)
    return [payload]


if __name__ == "__main__":
    print(f"Starting web hook server on http://0.0.0.0:{PORT}/open?token=...&device_id=...")
    with make_server("0.0.0.0", PORT, application) as httpd:
        httpd.serve_forever()
