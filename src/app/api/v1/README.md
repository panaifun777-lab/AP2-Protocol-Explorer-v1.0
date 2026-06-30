# AP2 `/api/v1`

The v1 API adds a stable adapter layer above the existing simulation endpoints.

Modes:

- `simulation`: returns the legacy mock route and payload that should be called by the UI.
- `base-sepolia`: returns an unsigned EVM transaction request for the user's wallet to sign.

The server does not store or use private keys.

Supported endpoints:

- `POST /api/v1/escrow/approve`
- `POST /api/v1/escrow/create-task`
- `POST /api/v1/escrow/withdraw`
- `POST /api/v1/escrow/settle`
- `POST /api/v1/tdpo/lock-contrarian`
- `POST /api/v1/tdpo/inject-factor`
- `POST /api/v1/tdpo/veto`
- `POST /api/v1/tdpo/claim`

Example:

```json
{
  "mode": "base-sepolia",
  "payee": "0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1",
  "baseAmount": "100000000000000000000",
  "optionAmount": "10000000000000000000",
  "durationSeconds": "1",
  "target": "XDP_Protocol_Genesis_Clean",
  "scope": "legal"
}
```

The response contains:

```json
{
  "ok": true,
  "data": {
    "mode": "base-sepolia",
    "action": "escrow.createTask",
    "txRequest": {
      "chainId": 84532,
      "to": "0xFd553E5989834DF76f6C790021FDDBfEB9dc2972",
      "data": "0x...",
      "value": "0"
    }
  }
}
```
