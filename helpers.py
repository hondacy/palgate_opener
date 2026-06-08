import time, os
from typing import Any
from urllib.parse import urljoin

import requests
from pylgate import generate_token
from pylgate.types import TokenType

# get env vars ({PHONE_NUMER} {SSESION_TOKEN} {TOKEN_TYPE}):
PHONE_NUMBER = int(os.getenv("PHONE_NUMBER"))
SESSION_TOKEN = bytes.fromhex(os.getenv("SESSION_TOKEN"))
TOKEN_TYPE = TokenType(int(os.getenv("TOKEN_TYPE")))

# CONSTANTS:
ANDROID_USER_AGENT = "okhttp/4.9.3"
BASE_URL = "https://api1.pal-es.com/v1/"


derived_token = generate_token(SESSION_TOKEN, PHONE_NUMBER, TOKEN_TYPE)

def authenticated_headers() -> dict[str, str]:
    return {
        "User-Agent": ANDROID_USER_AGENT,
        "X-Bt-Token": derived_token,
        "Content-Type": "application/json"
    }

def validate_response(response: requests.Response) -> dict[str, Any]:
    response_data = response.json()
    if not response.ok or response_data.get("err") or response_data.get("status") != "ok":
        raise RuntimeError(f"Request failed. Full response: {response_data}")
    return response_data

def get_palgate_device_list() -> dict[str, Any]:
    response = requests.get(
        urljoin(BASE_URL, "bt/devices"),
        headers=authenticated_headers(),
    )
    devices_data = validate_response(response)
    devices_filtered = [
        {
            "id": device.get("id"),
            "address": device.get("address"),
            "name": device.get("name"),
            "name1": device.get("name1"),
        }
       for device in devices_data.get("devices", [])
    ]
    return devices_filtered

def open_gate(DEVICE_ID: str) -> dict[str, Any]:
    response = requests.get(
        urljoin(BASE_URL, f"bt/device/{DEVICE_ID}/open-gate?openBy=100&outputNum=1"),
        headers=authenticated_headers(),
    )
    return validate_response(response)

def check_token() -> dict[str, Any]:
    ts = int(time.time())
    response = requests.get(
        urljoin(BASE_URL, f"bt/user/check-token?ts={ts}&ts_diff=0"),
        headers=authenticated_headers(),
    )
    return validate_response(response)

