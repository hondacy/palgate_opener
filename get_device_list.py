# Usage: 
# PHONE_NUMBER="972521234567" SESSION_TOKEN="6b3fa357sc67f3fa357sc67fa4" TOKEN_TYPE="1"  python3 ./get_device_list.py  

import json
import re
import helpers

RTL_EMBED = "\u202b"
POP_DIRECTIONAL = "\u202c"
HEBREW_VALUE_RE = re.compile(r'"([^"\n]*[\u0590-\u05FF][^"\n]*)"')

def wrap_hebrew_json_values(json_str: str) -> str:
    return HEBREW_VALUE_RE.sub(
        lambda m: f'"{RTL_EMBED}{m.group(1)}{POP_DIRECTIONAL}"',
        json_str,
    )

def pretty_print(data: dict) -> None:
    json_str = json.dumps(data, indent=2, ensure_ascii=False)
    print(wrap_hebrew_json_values(json_str))

def main() -> None:
    print("Checking token...")
    print(helpers.check_token())
    
    print("Get all gates info...")
    pretty_print(helpers.get_palgate_device_list())

if __name__ == "__main__":
    main()
