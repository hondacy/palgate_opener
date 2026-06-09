# Palgate Opener

Open your Palgate gate by pressing a link only

Usable for enabling others to also open your gate. For removing access for other, simply re-link the device.

## Usage:
Session generator adopted from: https://github.com/DonutByte/pylgate/tree/main

1. First, for getting the SESSION_TOKEN (Only need to be done once), install dependecies:
    ```bash
    pip install git+https://github.com/DonutByte/pylgate.git@main
    pip install qrcode requests

    ```

    * Then, link a new device thru your Palgate app. 
    Run the following script:
    ```bash
    curl https://raw.githubusercontent.com/DonutByte/pylgate/refs/heads/main/examples/generate_linked_device_session_token.py -O generate_linked_device_session_token.py
    python3 generate_linked_device_session_token.py
    ```
    A QR code will be displayed, Open the app and press "Settings" -> "Linked Devices" -> "Add Device". Scan the QR code.
    Write down the resulting information:
    ```bash
    Phone number (user id): <your phone number>
    Session token: <session token>
    Token type: 1 (TokenType.PRIMARY)
    ```

2. Find your gates ID's:
    ```bash
    python3 get_device_list.py {PHONE_NUMER} {SSESION_TOKEN} {TOKEN_TYPE}
    ```

    * Output:
        ```json
            Fetching all gates info...
            {
                "id": "4G600123456",
                "address": "Sderot David HaMelech, Israel",
                "name": " חניון כניסה מזרחית",
                "name1": "חניון",
                "type": "4G"
            },
            {
                "id": "4G600123499",
                "address": ...
  
        ```

    * Prepare the production, by Inserting the required vars to the scripts environment variables:
        ```
        PHONE_NUMER=
        SSESION_TOKEN=
        TOKEN_TYPE=

3. Finally, open the gate:
    ```bash
    python3 open_gate.py {DEVICE_ID}
    ```
    Example:
    ```bash
    python3 open_gate.py 4G600123456
    ```

4. you can host the script online and access via url!

## Cloudflare Worker deployment

This repository includes a ready-to-deploy Cloudflare Worker package.
Use `CLOUDFLARE_WORKER_DEPLOY.md` for setup, local testing, and deployment instructions.

## Debuging Palgate API
for debuging, try using the derived_token:

YOUR_DERIVED_TOKEN = {From debuging the helpers.generate_token}
curl -X GET \
  'https://api1.pal-es.com/v1/bt/devices' \
  -H 'X-Bt-Token: $YOUR_DERIVED_TOKEN' \
  -H 'Content-Type: application/json'

  On Windows:
  curl -X GET  "https://api1.pal-es.com/v1/bt/devices" -H "Content-Type: application/json"  -H "X-Bt-Token: 1100E2FEFEDBA..."