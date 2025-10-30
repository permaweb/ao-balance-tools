# Manual Mode - Command Reference Card

## Quick Reference

### Basic Syntax
```bash
balance-checker --mode manual --message-id <MESSAGE_ID> <PROCESS_ID>
```

### Short Form
```bash
balance-checker -m manual --message-id <MESSAGE_ID> <PROCESS_ID>
```

---

## Command Options

| Option | Short | Required | Default | Description |
|--------|-------|----------|---------|-------------|
| `--mode manual` | `-m manual` | Yes* | `dryrun` | Use manual mode |
| `--message-id <id>` | N/A | Yes** | - | Message ID to fetch |
| `--output <format>` | `-o <format>` | No | `console` | Output format |
| `--file <path>` | `-f <path>` | No | - | Output file path |
| `--concurrency <n>` | `-c <n>` | No | `15` | Concurrent requests |
| `--no-progress` | N/A | No | false | Disable progress bar |
| `--verbose` | `-v` | No | false | Verbose output |

\* Required for manual mode  
\** Required when using manual mode

---

## Examples

### 1. Basic Usage
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
```

### 2. Export to JSON
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -o json -f report.json
```

### 3. Export to CSV
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -o csv -f report.csv
```

### 4. Verbose Output
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -v
```

### 5. High Concurrency
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -c 30
```

### 6. No Progress Bar
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  --no-progress
```

### 7. All Options Combined
```bash
balance-checker -m manual \
  --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc \
  xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs \
  -o json -f report.json -c 25 -v --no-progress
```

---

## Output Formats

### Console (Default)
Pretty-printed table to terminal
```bash
balance-checker -m manual --message-id MSG_ID PROCESS_ID
```

### JSON
Machine-readable JSON format
```bash
balance-checker -m manual --message-id MSG_ID PROCESS_ID -o json -f out.json
```

### CSV
Spreadsheet-compatible format
```bash
balance-checker -m manual --message-id MSG_ID PROCESS_ID -o csv -f out.csv
```

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `--message-id required for manual mode` | Missing message ID | Add `--message-id <id>` |
| `Invalid message ID format` | Wrong ID format | Use 43-char alphanumeric ID |
| `Invalid process ID format` | Wrong process ID | Use 43-char alphanumeric ID |
| `Message not found on CU` | Message doesn't exist | Verify message ID |
| `CU_URL environment variable is required` | Missing config | Set `CU_URL` in .env |

---

## Environment Variables

### Required
```bash
CU_URL=https://cu.ao-testnet.xyz
```

### Optional
```bash
HYPERBEAM_BASE_URL=https://compute.hyperbeam.xyz
CONCURRENCY=15
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
TIMEOUT=30000
MAX_ADDRESSES=1000
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (all balances match) |
| `1` | Failure (mismatches found or error) |

---

## Common Workflows

### Audit Historical Balance
```bash
# Get message ID from previous run, then audit it
balance-checker -m manual --message-id <SAVED_MSG_ID> <PROCESS_ID>
```

### Compare Two Time Points
```bash
# Old message
balance-checker -m manual --message-id OLD_MSG <PROCESS> -o json -f old.json

# New message  
balance-checker -m manual --message-id NEW_MSG <PROCESS> -o json -f new.json

# Compare
diff old.json new.json
```

### Batch Process Multiple Messages
```bash
#!/bin/bash
for msg in MSG1 MSG2 MSG3; do
  balance-checker -m manual --message-id $msg PROCESS_ID -o json -f "$msg.json"
done
```

---

## Pro Tips

### 1. Save Message IDs
When using wallet or dryrun mode, save the message ID from the output for later manual mode audits.

### 2. Use Verbose for Debugging
Add `-v` to see detailed execution info including CU URL, message ID, and timing.

### 3. Adjust Concurrency
- Low (5-10): For rate-limited APIs
- Medium (15-20): Default, good balance
- High (25-30): For fast networks

### 4. Pipe Output
```bash
balance-checker -m manual --message-id MSG PROCESS | tee results.txt
```

### 5. Silent Mode
```bash
balance-checker -m manual --message-id MSG PROCESS --no-progress 2>/dev/null
```

---

## Help Commands

```bash
# Full help
balance-checker --help

# Version info
balance-checker --version

# Quick test (with dryrun)
balance-checker PROCESS_ID
```

---

## Documentation Links

- **Quick Start**: MANUAL_MODE_QUICK_START.md
- **Full Docs**: README.md
- **Technical**: MANUAL_MODE_IMPLEMENTATION.md
- **PRP**: PRPs/manual-mode-message-id-prp.md
