# Usage:
# python3.12 open_gate.py {DEVICE_ID}
# Debug from bash: PHONE_NUMBER="972521234567" SESSION_TOKEN="6b3fa357sc67f3fa357sc67fa4" TOKEN_TYPE="1" python3 ./open_gate.py 4G600123456

import sys
import helpers

def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python open_gate.py DEVICE_ID")
        sys.exit(1)

    device_id = sys.argv[1]

    print("Checking token...")
    print(helpers.check_token())
    
    print("Opening gate...")
    print(helpers.open_gate(device_id))


if __name__ == "__main__":
    main()

