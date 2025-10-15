# CU Compare - CU Balance Comparison Tool

Compare AO process balances between two different Compute Units (CUs) to validate synchronization and identify discrepancies.

## Overview

`cu-compare` sends a single balance message to an AO process, then fetches the results from two different CU endpoints and compares them. This helps identify:

- **Synchronization issues** between CUs
- **Missing addresses** in one CU vs another
- **Balance mismatches** for the same address across CUs
- **CU reliability** and consistency

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run comparison (requires demo.json wallet)
cu-compare <process-id>

# Or in development mode
npm run dev:cu <process-id>
```

## How It Works

1. **Send Message**: Sends a message with `Action = "Balances"` tag to the AO process using your wallet
2. **Get Message ID**: Receives a message ID from the message transaction
3. **Fetch from CU A**: Retrieves the result from first CU (default: cu.ardrive.io)
4. **Fetch from CU B**: Retrieves the result from second CU (default: cu.ao-testnet.xyz)
5. **Compare**: Compares the balance objects from both CUs
6. **Report**: Generates comprehensive comparison report

## Usage

### Basic Usage

Compare using default CUs (ardrive.io vs ao-testnet.xyz):

```bash
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
```

### Custom CU Endpoints

Specify custom CU URLs:

```bash
cu-compare <process-id> -a https://cu.ardrive.io -b https://cu.ao-testnet.xyz
```

### Custom Wallet

Use a different wallet file:

```bash
cu-compare <process-id> -w path/to/wallet.json
```

### Output Formats

#### Console Output (Default)

```bash
cu-compare <process-id>
```

#### JSON Export

```bash
cu-compare <process-id> -o json -f comparison-report.json
```

#### CSV Export

```bash
cu-compare <process-id> -o csv -f comparison-report.csv
```

### Verbose Mode

Get detailed execution information:

```bash
cu-compare <process-id> -v
```

## CLI Options

```
Usage: cu-compare [options] <process-id>

Arguments:
  process-id              AO process ID to compare

Options:
  -V, --version           output the version number
  -a, --cu-a <url>        First CU URL (default: env CU_URL_A or https://cu.ardrive.io)
  -b, --cu-b <url>        Second CU URL (default: env CU_URL_B or https://cu.ao-testnet.xyz)
  -w, --wallet <path>     Path to wallet JWK file (default: ./demo.json)
  -o, --output <format>   Output format: console, json, or csv (default: console)
  -f, --file <path>       Output file path (for json/csv formats)
  -v, --verbose           Enable verbose output
  -h, --help              display help for command
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
# CU endpoints
CU_URL_A=https://cu.ardrive.io
CU_URL_B=https://cu.ao-testnet.xyz

# Wallet file path
WALLET_PATH=./demo.json

# Optional: Retry configuration
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
TIMEOUT=30000
```

See `.env.example` for all available options.

### Wallet Requirements

The tool requires a JWK wallet file for signing the balance message. The wallet must be in JSON format:

```json
{
  "kty": "RSA",
  "n": "...",
  "e": "AQAB",
  "d": "...",
  ...
}
```

Default location: `./demo.json`

## Report Sections

### Console Report

The console report includes:

1. **Header**: Process ID, Message ID, Timestamp
2. **CU Endpoints**: URLs for both CUs
3. **Summary Statistics**:
   - Total addresses in each CU
   - Common addresses
   - Addresses unique to each CU
   - Matching vs mismatching balances
   - Accuracy percentage
   - Total discrepancy amount
4. **Unique to CU A**: Addresses only found in first CU
5. **Unique to CU B**: Addresses only found in second CU
6. **Mismatched Balances**: Addresses with different balances

### JSON Report Structure

```json
{
  "processId": "...",
  "messageId": "...",
  "cuAUrl": "https://cu.ardrive.io",
  "cuBUrl": "https://cu.ao-testnet.xyz",
  "totalAddressesA": 5797,
  "totalAddressesB": 5795,
  "commonAddresses": 5790,
  "onlyInA": 7,
  "onlyInB": 5,
  "matchingCount": 5780,
  "mismatchCount": 10,
  "accuracyPercentage": 99.83,
  "totalDiscrepancy": "500000",
  "mismatches": [...],
  "matches": [...],
  "uniqueToA": [...],
  "uniqueToB": [...],
  "timestamp": "2025-10-15T19:45:30.123Z"
}
```

### CSV Report

The CSV report includes all comparisons with columns:
- Address
- CU A Balance
- CU B Balance
- Status (Match/Mismatch/Only in CU A/Only in CU B)
- Difference

Plus a summary section at the end.

## Examples

### Example 1: Basic Comparison

```bash
$ cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE

Fetching balance data from CUs...

═══════════════════════════════════════════
  CU BALANCE COMPARISON REPORT
═══════════════════════════════════════════

Process ID: qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
Message ID: abc123...
Timestamp: 10/15/2025, 3:45:30 PM

CU Endpoints:
  CU A: https://cu.ardrive.io
  CU B: https://cu.ao-testnet.xyz

Summary:
  Total Addresses (CU A): 5797
  Total Addresses (CU B): 5797
  Common Addresses: 5797
  Only in CU A: 0
  Only in CU B: 0
  ✓ Matching: 5797
  ✗ Mismatching: 0
  Accuracy: 100.00%
  Total Discrepancy: 0

✓ All balances match perfectly!

═══════════════════════════════════════════
```

### Example 2: Comparison with Discrepancies

```bash
$ cu-compare <process-id> -v

ℹ Info: Loading configuration...
ℹ Info: CU A: https://cu.ardrive.io
ℹ Info: CU B: https://cu.ao-testnet.xyz
ℹ Info: Wallet: ./demo.json
ℹ Info: Loading wallet...
ℹ Info: Sending balance message...
ℹ Info: Message ID: xyz789...
ℹ Info: Fetching results from both CUs...
ℹ Info: CU A returned 5797 addresses
ℹ Info: CU B returned 5795 addresses
ℹ Info: Comparing balances...

[Report output showing mismatches]
```

### Example 3: JSON Export for Analysis

```bash
$ cu-compare <process-id> -o json -f comparison.json
✓ JSON report saved to: /path/to/comparison.json
```

Then analyze with jq:

```bash
# Count mismatches
jq '.mismatchCount' comparison.json

# List addresses only in CU A
jq '.uniqueToA[].address' comparison.json

# Find largest discrepancy
jq '.mismatches | sort_by(.difference | tonumber) | last' comparison.json
```

## Troubleshooting

### Error: "Wallet file not found"

Make sure `demo.json` exists in the current directory or specify the path:

```bash
cu-compare <process-id> -w path/to/wallet.json
```

### Error: "Invalid JWK format"

Ensure your wallet file contains a valid JWK with required fields (kty, n, e, d).

### Error: "No message ID returned"

Check that:
- Your wallet is valid and has permissions
- The process ID is correct (43 characters)
- You have network connectivity

### Error: "Failed to get result from CU"

This can happen if:
- The CU doesn't have the message result yet (try again in a few seconds)
- The CU endpoint is down or unreachable
- Network issues

Try with verbose mode for more details:

```bash
cu-compare <process-id> -v
```

### Timeout Issues

Increase timeout in `.env`:

```env
TIMEOUT=60000
```

## Differences from balance-checker

| Feature | balance-checker | cu-compare |
|---------|----------------|------------|
| **Purpose** | Compare AO vs Hyperbeam | Compare CU A vs CU B |
| **Method** | `dryrun()` | `message()` + `result()` |
| **Auth Required** | No | Yes (wallet) |
| **Message ID** | Not used | Required |
| **Use Case** | State validation | CU synchronization |
| **Output Focus** | Mismatches only | Mismatches + unique addresses |

## Advanced Usage

### Compare Same CU (Sanity Check)

Verify tool works correctly by comparing CU with itself:

```bash
cu-compare <process-id> -a https://cu.ardrive.io -b https://cu.ardrive.io
```

Should show 100% match.

### Monitor CU Sync Over Time

Run periodically and save results:

```bash
#!/bin/bash
PROCESS="qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE"
DATE=$(date +%Y%m%d_%H%M%S)
cu-compare $PROCESS -o json -f "reports/sync_${DATE}.json"
```

### Batch Compare Multiple Processes

```bash
#!/bin/bash
PROCESSES=(
  "process1..."
  "process2..."
  "process3..."
)

for process in "${PROCESSES[@]}"; do
  echo "Comparing $process..."
  cu-compare "$process" -o json -f "report_${process}.json"
done
```

## Performance

- **Typical Run**: 10-30 seconds for most processes
- **Network Dependent**: Time varies based on CU response times
- **Retry Logic**: Automatic retry with exponential backoff
- **Memory**: Handles 5000+ addresses efficiently

## Exit Codes

- `0`: Success - all balances match, no unique addresses
- `1`: Discrepancies found (mismatches or unique addresses) or error occurred

## Support

For issues or questions:
1. Check this documentation
2. Review error messages with verbose mode (`-v`)
3. Verify wallet and process ID format
4. Check network connectivity to CU endpoints

## Related Tools

- **balance-checker**: Compare AO process against Hyperbeam API
- See main [README.md](./README.md) for overview of all tools
