# Manual Mode Quick Start Guide

## What is Manual Mode?

Manual mode allows you to validate balances from a **pre-existing message ID** without sending a new message to the AO process. This is useful for:
- 🕐 Auditing historical balance states
- 🔍 Validating specific message results
- 🐛 Debugging balance discrepancies at a point in time
- ⚡ Reducing unnecessary messages to AO processes

## Quick Command

```bash
balance-checker --mode manual \
  --message-id <YOUR_MESSAGE_ID> \
  <PROCESS_ID>
```

## Real Example

```bash
balance-checker --mode manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
```

## Common Use Cases

### 1. Audit a Specific Message
```bash
# Validate balances from a known message
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
```

### 2. Export Results to JSON
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -o json -f audit-report.json
```

### 3. Debug with Verbose Output
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -v
```

### 4. High-Speed Processing
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -c 30
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. You provide a message ID from a previous AO message         │
│     ↓                                                            │
│  2. Tool fetches the message result from CU                     │
│     ↓                                                            │
│  3. Parses balance data from the message                        │
│     ↓                                                            │
│  4. Compares each balance against Hyperbeam API                 │
│     ↓                                                            │
│  5. Generates comparison report                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Requirements

### Message ID Format
- **Length**: Exactly 43 characters
- **Characters**: Alphanumeric, underscore (_), hyphen (-)
- **Example**: `UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc`

### Environment Variables
```bash
# Required
CU_URL=https://cu.ao-testnet.xyz

# Optional
HYPERBEAM_BASE_URL=https://compute.hyperbeam.xyz
CONCURRENCY=15
```

## Error Messages

### Missing Message ID
```
Error: --message-id required for manual mode
```
**Fix**: Add `--message-id <id>` to your command

### Invalid Message ID Format
```
Error: Invalid message ID format: abc123. Expected 43-character alphanumeric string.
```
**Fix**: Ensure message ID is exactly 43 characters and contains only alphanumeric, `_`, or `-`

### Message Not Found
```
Error: Failed to fetch balances from message UZ0D49...: Message not found on CU
```
**Fix**: Verify the message ID exists and the message has been processed

## Comparing with Other Modes

| Feature | Dryrun | Wallet | **Manual** |
|---------|--------|--------|------------|
| Requires wallet | ❌ | ✅ | ❌ |
| Sends new message | ✅ | ✅ | ❌ |
| Requires message ID | ❌ | ❌ | ✅ |
| Speed | Fast | Fast | **Fastest** |
| Use case | Quick check | Authenticated | **Historical audit** |

## Tips & Tricks

### 1. Get Message ID from Previous Run
When running in wallet mode or using cu-compare, the message ID is displayed:
```
Message ID: UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc
```
Save this for later manual mode audits!

### 2. Batch Processing
Process multiple message IDs with a simple script:
```bash
#!/bin/bash
for msg_id in "UZ0D49e04..." "ABC123xyz..." "DEF456uvw..."; do
  balance-checker -m manual --message-id "$msg_id" "$PROCESS_ID" -o json -f "report-$msg_id.json"
done
```

### 3. Compare Across Time
Audit how balances changed:
```bash
# Message from yesterday
balance-checker -m manual --message-id OLD_MSG_ID PROCESS_ID -o json -f old.json

# Message from today
balance-checker -m manual --message-id NEW_MSG_ID PROCESS_ID -o json -f new.json

# Diff the results
diff old.json new.json
```

## Need Help?

```bash
# View all options
balance-checker --help

# Check version
balance-checker --version
```

## Next Steps

- See [README.md](./README.md) for complete documentation
- See [MANUAL_MODE_IMPLEMENTATION.md](./MANUAL_MODE_IMPLEMENTATION.md) for technical details
- See [PRPs/manual-mode-message-id-prp.md](./PRPs/manual-mode-message-id-prp.md) for design decisions
