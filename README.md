# AO Balance Validation Tools

A suite of high-performance CLI tools for validating and comparing AO process balances across different data sources and Compute Units.

## Tools Overview

This repository contains two complementary validation tools:

### 1. **balance-checker** - Hyperbeam Validation
Compares AO process balances between the source of truth (via `@permaweb/aoconnect`) and the Hyperbeam API to ensure data integrity.

### 2. **cu-compare** - CU Synchronization Checker
Compares AO process balances between two different Compute Units (CUs) to validate synchronization and detect discrepancies.

---

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run balance-checker (Hyperbeam validation)
balance-checker <process-id>

# Run cu-compare (CU synchronization check - requires wallet)
cu-compare <process-id>
```

## Development Mode

```bash
# Run balance-checker in dev mode
npm run dev -- <process-id> [options]

# Run cu-compare in dev mode
npm run dev:cu -- <process-id> [options]
```

---

## balance-checker - Hyperbeam Validation Tool

Validates AO process balances by comparing data from AO processes (via `@permaweb/aoconnect`) against the Hyperbeam API.

### Features

- 🚀 **Concurrent Processing**: Efficiently processes 1000+ addresses with configurable concurrency
- 🔄 **Automatic Retry**: Intelligent retry logic with exponential backoff for network failures
- 📊 **Multiple Output Formats**: Console, JSON, and CSV export options
- 📈 **Progress Tracking**: Real-time progress bar during processing
- 🎯 **Accurate Comparison**: BigInt-based balance comparison for precision
- ⚙️ **Configurable**: Environment-based configuration for flexibility
- 🛡️ **Type-Safe**: Built with TypeScript for robust error handling

### Configuration

Create a `.env` file in the project root:

```env
# Required
CU_URL=https://cu.ao-testnet.xyz

# Optional - Hyperbeam and Performance
HYPERBEAM_BASE_URL=https://compute.hyperbeam.xyz
CONCURRENCY=15
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
TIMEOUT=30000
MAX_ADDRESSES=10

# Wallet Mode (optional - can be passed via --wallet flag)
WALLET_PATH=./demo.json
```

**Note:** The `HYPERBEAM_BASE_URL` can be overridden at runtime using the `--hyperbeam` CLI option, which is useful for processes with balances on specific Hyperbeam instances:

### Usage Examples

#### Dryrun Mode (Default)

```bash
# Basic console output
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Export to JSON
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f report.json

# Export to CSV
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o csv -f report.csv

# Custom concurrency
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -c 20

# Verbose mode with progress disabled
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -v --no-progress

# Custom Hyperbeam endpoint (for processes on specific state servers)
balance-checker --hyperbeam https://state-1.forward.computer xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Combine custom Hyperbeam with other options
balance-checker --hyperbeam https://state-1.forward.computer xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f report.json
```

#### Wallet Mode (New)

Validates balances by sending an authenticated message with a wallet and comparing the result against Hyperbeam:

```bash
# Basic wallet mode with console output
balance-checker --mode wallet --wallet demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Short form
balance-checker -m wallet -w demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Export to JSON
balance-checker -m wallet -w demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f wallet-report.json

# Using WALLET_PATH environment variable
WALLET_PATH=demo.json balance-checker --mode wallet xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Verbose output with custom concurrency
balance-checker -m wallet -w demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -v -c 20
```

#### Manual Mode

Validates balances by fetching the result of a specific message ID (no new message sent):

```bash
# Basic manual mode with console output
balance-checker --mode manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Short form
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Export to JSON
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f manual-report.json

# Export to CSV
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o csv -f manual-report.csv

# Verbose output with custom concurrency
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -v -c 20
```

### CLI Options

```
Usage: balance-checker [options] <process-id>

Arguments:
  process-id                    AO process ID to check balances for

Options:
  -V, --version                 output the version number
  -m, --mode <type>             Balance fetch mode: dryrun, wallet, or manual (default: "dryrun")
  -w, --wallet <path>           Path to wallet file (required for wallet mode)
  --message-id <id>             Message ID to fetch balances from (required for manual mode)
  --hyperbeam <url>             Custom Hyperbeam endpoint URL (overrides HYPERBEAM_BASE_URL env var)
  -o, --output <format>         Output format: console, json, or csv (default: "console")
  -f, --file <path>             Output file path (for json/csv formats)
  -c, --concurrency <number>    Number of concurrent requests (default: "15")
  --no-progress                 Disable progress bar
  -v, --verbose                 Enable verbose output
  -h, --help                    display help for command
```

### Modes

**Dryrun Mode (Default)**
- Uses `dryrun()` from @permaweb/aoconnect (unauthenticated)
- Faster, simpler, no wallet required
- Good for quick validations

**Wallet Mode**
- Sends authenticated message with Action="Balances" to AO process
- Uses Arweave wallet for signing (JWK format)
- Mirrors how cu-compare works
- Better for production systems requiring audit trails

**Manual Mode**
- Fetches balance data from a specific pre-existing message ID
- No new messages sent to AO process
- Useful for auditing historical balance states
- Good for validating specific message results and debugging discrepancies

### Sample Output

```
════════════════════════════════════════════════════════════════════════════════
  BALANCE COMPARISON REPORT
════════════════════════════════════════════════════════════════════════════════

Process ID: xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
Timestamp: 10/15/2025, 3:45:30 PM
Total Addresses: 150

Summary:
  ✓ Matching: 148
  ✗ Mismatching: 2
  Accuracy: 98.67%
  Total Discrepancy: 500000

✓ Balance check completed with 2 mismatches
════════════════════════════════════════════════════════════════════════════════
```

---

## cu-compare - CU Synchronization Tool

Compares AO process balances between two different Compute Units to validate synchronization and identify discrepancies.

### Features

- 🔐 **Authenticated Requests**: Uses Arweave wallet for message signing
- 🔄 **Dual CU Comparison**: Fetches and compares data from two CU endpoints
- 📊 **Multiple Output Formats**: Console, JSON, and CSV reports
- 🎯 **Comprehensive Analysis**: Identifies unique addresses and balance mismatches
- ⚙️ **Flexible Configuration**: Support for custom CU URLs via CLI or environment

### Prerequisites

Requires an Arweave wallet JWK file for signing messages. You can:
- Use an existing wallet JSON file
- Generate a new wallet using [Arweave JS](https://github.com/ArweaveTeam/arweave-js)

### Configuration

Add to your `.env` file:

```env
# CU comparison settings
CU_URL_A=https://cu.ardrive.io
CU_URL_B=https://cu.ao-testnet.xyz
WALLET_PATH=./path/to/wallet.json
```

### Usage Examples

```bash
# Basic comparison (uses .env CU URLs)
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE

# Custom CU URLs
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE \
  -a https://cu.ardrive.io \
  -b https://cu.ao-testnet.xyz

# Export to JSON
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE -o json -f cu-report.json

# Export to CSV
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE -o csv -f cu-report.csv

# Custom wallet path
cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE -w ./my-wallet.json
```

### CLI Options

```
Usage: cu-compare [options] <process-id>

Arguments:
  process-id                    AO process ID to check balances for

Options:
  -V, --version                 output the version number
  -a, --cu-a <url>              CU A endpoint URL (default: from .env)
  -b, --cu-b <url>              CU B endpoint URL (default: from .env)
  -w, --wallet <path>           Path to Arweave wallet JWK file (default: from .env)
  -o, --output <format>         Output format: console, json, or csv (default: "console")
  -f, --file <path>             Output file path (for json/csv formats)
  -h, --help                    display help for command
```

### Sample Output

```
════════════════════════════════════════════════════════════════════════════════
  CU BALANCE COMPARISON REPORT
════════════════════════════════════════════════════════════════════════════════

Process ID: qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
Message ID: Dwi7HiSuoXB2Bt_Eyjh7RdmG-zP4h92dh2_xXA81sH8
Timestamp: 10/15/2025, 4:40:50 PM

CU Endpoints:
  CU A: https://cu.ardrive.io
  CU B: https://cu.ao-testnet.xyz

Summary:
  Total Addresses (CU A): 5799
  Total Addresses (CU B): 5799
  Common Addresses: 5799
  Only in CU A: 0
  Only in CU B: 0
  ✓ Matching: 5799
  ✗ Mismatching: 0
  Accuracy: 100.00%
  Total Discrepancy: 0

✓ All balances match perfectly!
════════════════════════════════════════════════════════════════════════════════
```

---

## Architecture

### Project Structure

```
balance-checker/
├── src/
│   ├── cli.ts              # balance-checker CLI entry point
│   ├── cu-compare.ts       # cu-compare CLI entry point
│   ├── config.ts           # Configuration management
│   ├── types.ts            # TypeScript type definitions
│   ├── aoClient.ts         # AO process interaction (dryrun)
│   ├── cuClient.ts         # CU client (message/result)
│   ├── hyperbeam.ts        # Hyperbeam API client
│   ├── comparator.ts       # Balance comparison logic
│   ├── cuComparator.ts     # CU comparison logic
│   ├── processor.ts        # Concurrent processing orchestration (dryrun mode)
│   ├── walletProcessor.ts  # Wallet mode processor
│   ├── manualProcessor.ts  # Manual mode processor
│   └── reporter.ts         # Multi-format report generation
├── tests/
│   ├── cli.test.ts
│   ├── config.test.ts
│   ├── walletProcessor.test.ts
│   └── manualProcessor.test.ts
├── .env.example            # Environment variable template
├── package.json
└── README.md
```

### Key Design Decisions

1. **Concurrent Batch Processing**: Uses `p-limit` for controlled concurrency
2. **BigInt for Precision**: All balance calculations use BigInt for accuracy
3. **Graceful Error Handling**: Individual failures don't stop the entire process
4. **Exponential Backoff**: Intelligent retry mechanism with jitter
5. **Modular Architecture**: Separation of concerns for maintainability

---

## Performance

### balance-checker
- **100 addresses**: ~10-15 seconds
- **1000 addresses**: <2 minutes
- **5000 addresses**: ~8-10 minutes

### cu-compare
- **5000+ addresses**: ~10-15 seconds (single authenticated message + 2 result fetches)

Performance depends on network latency, API response times, and configuration settings.

---

## Troubleshooting

### "CU_URL environment variable is required"
Create a `.env` file with the required `CU_URL` variable.

### "Wallet file not found"
Ensure `WALLET_PATH` in `.env` points to a valid Arweave JWK JSON file.

### Rate Limiting Issues
- Reduce concurrency: `-c 5`
- Increase retry delay: `RETRY_DELAY_MS=2000`

### Timeout Errors
Increase timeout in `.env`:
```env
TIMEOUT=60000
```

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- <process-id>
npm run dev:cu -- <process-id>

# Type checking
npm run type-check

# Build for production
npm run build
```

---

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
