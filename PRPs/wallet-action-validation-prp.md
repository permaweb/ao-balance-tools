# Project Request Protocol: Wallet Action Validation

## Project Overview

### Purpose
Enhance the balance-checker CLI to support an alternative validation approach where balances are retrieved via authenticated message sending (using demo.json wallet) to an AO process, then validating the results against the Hyperbeam balances URL endpoint. This approach mirrors how cu-compare works but validates against Hyperbeam instead of comparing two CUs.

### Background
Currently, balance-checker uses `dryrun()` to fetch balances from AO processes and compares against Hyperbeam. This PRP introduces a wallet-based approach where:
1. Load a wallet from demo.json (or configurable path)
2. Send an authenticated `message()` with Action="Balances" to the AO process
3. Retrieve the result using `result()` 
4. Use the returned balances as the "source of truth" (Source A)
5. Fetch balances from Hyperbeam API as before (Source B)
6. Compare Source A vs Source B and generate report

### Scope
- Add wallet-based message sending functionality to balance-checker
- Reuse existing Hyperbeam client and comparison logic
- Support both dryrun (existing) and wallet-based (new) modes
- Maintain backward compatibility with current CLI interface

## Technical Requirements

### Functional Requirements
- **FR1**: Load Arweave wallet from demo.json (or configurable path via CLI/env)
- **FR2**: Send authenticated message with `Action = "Balances"` to AO process
- **FR3**: Retrieve and parse message result containing balance data
- **FR4**: Use wallet-fetched balances as Source A (source of truth)
- **FR5**: Fetch corresponding balances from Hyperbeam API as Source B
- **FR6**: Compare Source A vs Source B balances
- **FR7**: Generate same format report showing mismatches and statistics
- **FR8**: Support mode selection: `--mode dryrun` (default) or `--mode wallet`
- **FR9**: Provide wallet path via CLI option: `--wallet <path>` or env: `WALLET_PATH`

### Technical Requirements
- **TR1**: Reuse existing `@permaweb/aoconnect` message/result functions
- **TR2**: Leverage existing CUClient wallet loading logic from cu-compare
- **TR3**: Reuse existing HyperbeamClient for balance fetching
- **TR4**: Reuse existing BalanceComparator for comparison logic
- **TR5**: Reuse existing Reporter for output generation
- **TR6**: Add new WalletBalanceProcessor class parallel to BalanceProcessor
- **TR7**: Maintain TypeScript type safety
- **TR8**: Handle wallet file validation and JWK format verification

### Non-Functional Requirements
- **NFR1**: Backward compatibility - existing dryrun mode continues to work
- **NFR2**: Performance - wallet mode should complete in similar time to dryrun mode
- **NFR3**: Security - wallet file should never be logged or exposed
- **NFR4**: Usability - clear error messages for wallet-related issues
- **NFR5**: Maintainability - minimize code duplication between modes

## Proposed Solutions

### Solution 1: Dual-Mode CLI with Separate Processors

**Architecture**:
- Keep existing BalanceProcessor for dryrun mode
- Create new WalletBalanceProcessor for wallet mode
- Add mode selection flag to CLI
- Route to appropriate processor based on mode

**Implementation**:
```
CLI (cli.ts)
  ├─→ mode == "dryrun"
  │     └─→ BalanceProcessor (existing)
  │           ├─→ AOClient.getBalances() (dryrun)
  │           └─→ HyperbeamClient.getBalance()
  │
  └─→ mode == "wallet"
        └─→ WalletBalanceProcessor (new)
              ├─→ CUClient.loadWallet()
              ├─→ CUClient.sendBalanceMessage()
              ├─→ CUClient.getResultFromCU()
              └─→ HyperbeamClient.getBalance()
```

**File Structure**:
```
src/
  cli.ts                      # Updated with mode flag
  config.ts                   # Add WALLET_PATH support
  types.ts                    # Add mode types
  processor.ts                # Existing dryrun processor
  walletProcessor.ts          # NEW: Wallet-based processor
  aoClient.ts                 # Existing dryrun client
  cuClient.ts                 # Existing wallet client (reuse)
  hyperbeam.ts                # Existing (shared)
  comparator.ts               # Existing (shared)
  reporter.ts                 # Existing (shared)
```

**Pros**:
- Clear separation of concerns
- Minimal risk to existing functionality
- Easy to test independently
- Can deprecate dryrun mode in future if needed
- Reuses maximum amount of existing code

**Cons**:
- Some code duplication between processors
- CLI has slightly more complexity with mode flag
- Need to maintain two code paths

**Estimated Complexity**: Medium (3-4 days)

### Solution 2: Unified Processor with Strategy Pattern

**Architecture**:
- Single BalanceProcessor with pluggable balance fetching strategy
- BalanceFetchStrategy interface with two implementations:
  - DryrunStrategy (existing logic)
  - WalletStrategy (new logic)
- CLI configures strategy based on mode

**Implementation**:
```typescript
interface BalanceFetchStrategy {
  fetchBalances(processId: string): Promise<AOBalanceResponse>;
}

class DryrunStrategy implements BalanceFetchStrategy {
  async fetchBalances(processId: string) {
    // Existing AOClient logic
  }
}

class WalletStrategy implements BalanceFetchStrategy {
  async fetchBalances(processId: string) {
    // Load wallet, send message, get result
  }
}

class UnifiedBalanceProcessor {
  constructor(strategy: BalanceFetchStrategy) {}
  
  async processBalances() {
    const balances = await this.strategy.fetchBalances();
    // Rest is identical
  }
}
```

**Pros**:
- More elegant design pattern
- Single processor to maintain
- Easy to add more strategies in future
- Better abstraction and encapsulation
- Reduced code duplication

**Cons**:
- More refactoring of existing code required
- Higher risk of breaking existing functionality
- More complex abstractions to understand
- Overhead for simple use case

**Estimated Complexity**: Medium-High (5-6 days)

### Solution 3: Separate Binary/Command for Wallet Mode

**Architecture**:
- Create new `balance-checker-wallet` command
- Completely independent implementation
- Shares library code via internal modules
- Two separate CLI entry points

**Implementation**:
```
src/
  cli.ts                      # Existing balance-checker
  cli-wallet.ts               # NEW: balance-checker-wallet
  lib/
    balanceComparison.ts      # Shared comparison logic
    hyperbeamClient.ts        # Shared client
    reporter.ts               # Shared reporter
    types.ts                  # Shared types
  dryrun/
    processor.ts              # Dryrun-specific
    aoClient.ts               # Dryrun-specific
  wallet/
    processor.ts              # Wallet-specific
    cuClient.ts               # Wallet-specific
```

**package.json**:
```json
{
  "bin": {
    "balance-checker": "dist/cli.js",
    "balance-checker-wallet": "dist/cli-wallet.js"
  }
}
```

**Pros**:
- Zero risk to existing functionality
- Each tool is simpler and more focused
- Easy to document separately
- Users choose appropriate tool for their use case
- Can be developed independently

**Cons**:
- Two separate tools to maintain
- User confusion about which to use
- More build/deployment complexity
- Code duplication across entry points
- Harder to share improvements

**Estimated Complexity**: Medium (4-5 days)

## Selected Solution: Solution 1 - Dual-Mode CLI with Separate Processors

### Rationale

**Why Solution 1**:
1. **Balance of Simplicity & Flexibility**: Provides both modes in single tool without over-engineering
2. **Low Risk**: Existing functionality remains untouched in separate processor
3. **Code Reuse**: Leverages existing CUClient, HyperbeamClient, Comparator, Reporter
4. **User Experience**: Single tool with intuitive mode flag is easier to use
5. **Maintainability**: Clear separation makes debugging and testing straightforward
6. **Evolution Path**: Can refactor to Solution 2 later if complexity grows

**Why Not Solution 2**:
- Over-engineered for current needs
- Higher risk of breaking existing functionality
- More complex abstractions add cognitive overhead
- Refactoring effort doesn't provide proportional value

**Why Not Solution 3**:
- User confusion with multiple tools
- Harder to discover and document
- Duplicates CLI logic and maintenance burden
- Doesn't leverage single-tool benefits

### Implementation Details

**CLI Changes**:
```typescript
program
  .option('-m, --mode <type>', 'Balance fetch mode: dryrun or wallet', 'dryrun')
  .option('-w, --wallet <path>', 'Path to wallet file (required for wallet mode)')
```

**Mode Routing**:
```typescript
if (mode === 'wallet') {
  if (!walletPath) {
    throw new Error('--wallet option required for wallet mode');
  }
  const processor = new WalletBalanceProcessor(config, walletPath);
  comparisons = await processor.validateAndProcess(processId, showProgress);
} else {
  const processor = new BalanceProcessor(config);
  comparisons = await processor.validateAndProcess(processId, showProgress);
}
```

## Implementation Steps

### Phase 1: Configuration & Types (Day 1, 2 hours)
1. Update `types.ts`:
   - Add `Mode` type: `'dryrun' | 'wallet'`
   - Add `WalletConfig` interface extension
2. Update `config.ts`:
   - Add `WALLET_PATH` env variable support
   - Add wallet path validation
3. Update CLI help documentation

### Phase 2: Create WalletBalanceProcessor (Day 1-2, 6 hours)
1. Create `src/walletProcessor.ts`:
   ```typescript
   export class WalletBalanceProcessor {
     private cuClient: CUClient;
     private comparator: BalanceComparator;
     private config: Config;
     private walletPath: string;
   
     async processBalances(processId: string): Promise<BalanceComparison[]> {
       // 1. Load wallet
       const wallet = await this.cuClient.loadWallet(this.walletPath);
       
       // 2. Send message with Action=Balances
       const messageId = await this.cuClient.sendBalanceMessage(processId, wallet);
       
       // 3. Get result (balances)
       const aoBalances = await this.cuClient.getResultFromCU(
         messageId, 
         processId, 
         this.config.cuUrl
       );
       
       // 4. Extract addresses
       const addresses = this.comparator.extractAddresses(aoBalances);
       
       // 5. Create HyperbeamClient
       const hyperbeamClient = new HyperbeamClient(this.config, processId);
       
       // 6. Concurrent fetch and compare (same as BalanceProcessor)
       // ... (reuse existing concurrent processing logic)
     }
   }
   ```

2. Reuse concurrent processing logic:
   - Extract common concurrent processing to shared utility
   - Or duplicate with clear comments for future refactoring

### Phase 3: CLI Integration (Day 2, 3 hours)
1. Update `cli.ts`:
   - Add `--mode` option
   - Add `--wallet` option
   - Add mode validation
   - Route to appropriate processor
   - Update error messages

2. Validate combinations:
   - `--mode wallet` requires `--wallet`
   - `--mode dryrun` ignores `--wallet` (with warning)

### Phase 4: Error Handling & Validation (Day 3, 4 hours)
1. Wallet file validation:
   - Check file exists
   - Validate JWK format
   - Clear error messages
2. Process validation:
   - Reuse existing process ID validation
3. Message/result error handling:
   - Handle timeout scenarios
   - Retry logic (already in CUClient)
   - Clear error messages for auth failures

### Phase 5: Testing (Day 3-4, 6 hours)
1. Unit tests:
   - WalletBalanceProcessor tests
   - Mock CUClient, HyperbeamClient
   - Test error scenarios
2. Integration tests:
   - Test with real demo.json wallet
   - Test against known process ID
   - Verify report accuracy
3. CLI tests:
   - Test mode routing
   - Test validation logic
   - Test error messages

### Phase 6: Documentation (Day 4, 2 hours)
1. Update README.md:
   - Add wallet mode section
   - Usage examples
   - Configuration examples
2. Update ARCHITECTURE.md:
   - Document new processor
   - Update flow diagrams
3. Add inline code documentation
4. Create example .env with WALLET_PATH

## Success Criteria

### Functional Success Criteria
- ✅ **SC1**: Wallet mode successfully loads wallet from demo.json
- ✅ **SC2**: Wallet mode sends authenticated message and retrieves result
- ✅ **SC3**: Wallet mode accurately compares balances against Hyperbeam
- ✅ **SC4**: Dryrun mode continues to work without any regression
- ✅ **SC5**: Report format is identical between modes
- ✅ **SC6**: CLI validates mode and wallet path combinations correctly
- ✅ **SC7**: Supports WALLET_PATH environment variable

### Performance Success Criteria
- ✅ **SC8**: Wallet mode processes 1000 addresses in under 2 minutes
- ✅ **SC9**: Wallet mode has <10% overhead vs dryrun mode
- ✅ **SC10**: Message sending and result retrieval complete in <5 seconds

### Quality Success Criteria
- ✅ **SC11**: Zero regressions in existing dryrun mode tests
- ✅ **SC12**: Wallet-specific code has 90%+ test coverage
- ✅ **SC13**: Clear error messages for all wallet-related failures
- ✅ **SC14**: No wallet data logged or exposed in errors
- ✅ **SC15**: TypeScript types prevent incorrect mode usage

### Usability Success Criteria
- ✅ **SC16**: Single command execution: `balance-checker --mode wallet --wallet demo.json <process-id>`
- ✅ **SC17**: Help text clearly explains both modes
- ✅ **SC18**: Errors guide users to correct usage
- ✅ **SC19**: Default mode (dryrun) requires no changes to existing usage
- ✅ **SC20**: Wallet mode setup documented with examples

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Wallet file security exposure | Low | Critical | Never log wallet contents, validate file permissions |
| Message sending failures | Medium | High | Reuse proven CUClient retry logic, clear error messages |
| Result retrieval timeout | Medium | Medium | Configurable timeout, retry with backoff |
| Authentication failures | Medium | High | Validate wallet format before sending, test with known good wallet |
| Regression in dryrun mode | Low | High | Keep processors separate, comprehensive regression testing |
| User confusion about modes | Medium | Low | Clear documentation, helpful error messages, good defaults |
| demo.json not gitignored | Low | Critical | Add to .gitignore, document in README, provide .example |

## Comparison with Existing Patterns

### Similarities to cu-compare
WalletBalanceProcessor will follow cu-compare's proven patterns:
- Wallet loading from CUClient ✅
- Message sending with `message()` ✅
- Result retrieval with `result()` ✅
- Retry logic and error handling ✅

### Differences from cu-compare
| Aspect | cu-compare | wallet mode (this PRP) |
|--------|-----------|------------------------|
| Source B | Second CU | Hyperbeam API |
| Comparison | CU A vs CU B | Message result vs Hyperbeam |
| Client | Two CUClient instances | CUClient + HyperbeamClient |
| Purpose | CU synchronization | Hyperbeam validation |

### Code Reuse Opportunities
1. **CUClient**: 100% reuse (wallet loading, message/result)
2. **HyperbeamClient**: 100% reuse (balance fetching)
3. **BalanceComparator**: 100% reuse (comparison logic)
4. **Reporter**: 100% reuse (output formatting)
5. **Config**: Extend with wallet path support
6. **Types**: Add mode-related types

## Future Enhancements

1. **Auto-detect Mode**: Automatically use wallet mode if --wallet provided
2. **Wallet Encryption**: Support encrypted wallet files with passphrase
3. **Multiple Wallets**: Rotate between wallets to avoid rate limits
4. **Wallet Generation**: Built-in wallet generation for testing
5. **Cached Results**: Cache message results to avoid redundant CU calls
6. **Hybrid Mode**: Use both dryrun and wallet, compare all three sources
7. **Performance Comparison**: Benchmark dryrun vs wallet mode automatically

## Migration Path

### For Existing Users
No migration required - dryrun mode is default and unchanged.

### Adoption Path for Wallet Mode
1. **Week 1**: Release with documentation
2. **Week 2**: Gather feedback on wallet mode usage
3. **Month 1**: Consider making wallet mode default if superior
4. **Month 3**: Evaluate deprecating dryrun mode if wallet mode proves more reliable

### Rollback Plan
If wallet mode has critical issues:
1. Remove `--mode` option temporarily
2. Keep dryrun mode as only option
3. Fix wallet mode issues offline
4. Re-release when stable

## Example Usage

### Dryrun Mode (Existing)
```bash
balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

balance-checker xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f report.json
```

### Wallet Mode (New)
```bash
balance-checker --mode wallet --wallet demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

balance-checker -m wallet -w demo.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o csv -f wallet-report.csv

WALLET_PATH=demo.json balance-checker --mode wallet xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
```

### Error Examples
```bash
balance-checker --mode wallet xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
# Error: --wallet option required for wallet mode

balance-checker --mode wallet --wallet invalid.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
# Error: Wallet file not found: invalid.json

balance-checker --mode wallet --wallet bad-format.json xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
# Error: Invalid JWK format: missing required fields (kty, n, e)
```

## Expected Output

Same report format as dryrun mode:

```
════════════════════════════════════════════════════════════════════════════════
  BALANCE COMPARISON REPORT (WALLET MODE)
════════════════════════════════════════════════════════════════════════════════

Process ID: xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
Message ID: Dwi7HiSuoXB2Bt_Eyjh7RdmG-zP4h92dh2_xXA81sH8
Mode: wallet
Timestamp: 10/17/2025, 3:45:30 PM
Total Addresses: 150

Summary:
  ✓ Matching: 148
  ✗ Mismatching: 2
  Accuracy: 98.67%
  Total Discrepancy: 500000

✓ Balance check completed with 2 mismatches
════════════════════════════════════════════════════════════════════════════════
```

## Conclusion

Solution 1 provides the optimal balance of:
- **Simplicity**: Clear dual-mode design
- **Safety**: Zero risk to existing functionality  
- **Reusability**: Maximizes existing code reuse
- **Extensibility**: Easy to add more modes in future
- **User Experience**: Single tool with intuitive interface

The implementation leverages proven patterns from cu-compare while maintaining the balance-checker's existing architecture and user interface conventions.
