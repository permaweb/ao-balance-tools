# Project Request Protocol: CU Balance Comparison CLI

## Project Overview

### Purpose
Develop a CLI tool that compares AO process balances between two different Compute Units (CUs). This enables validation of balance consistency across different CU endpoints (e.g., `cu.ardrive.io` vs `cu.ao-testnet.xyz`) to ensure data integrity and identify potential synchronization issues.

### Scope
- Send a message with `Action = "Balances"` to an AO process using `@permaweb/aoconnect`'s `message` function
- Retrieve the message result from two different CU endpoints using `result` function
- Extract balance data from `Output.data` property (JSON object with address->balance mapping)
- Compare balance objects from both CUs address-by-address
- Identify discrepancies between the two CU responses
- Generate detailed comparison report showing mismatches
- Support configurable CU endpoints and wallet via environment variables or CLI arguments

### Context
Building on the existing `balance-checker` tool that compares AO process balances against Hyperbeam, this new tool will compare balances between two independent CU sources. This is critical for:
- Validating CU synchronization
- Identifying data inconsistencies between CU instances
- Debugging process state issues
- Ensuring reliability of different CU endpoints

## Technical Requirements

### Functional Requirements
- **FR1**: Accept AO process ID as input parameter
- **FR2**: Accept two CU URLs (CU_A and CU_B) as inputs
- **FR3**: Load wallet JWK from file (default: demo.json)
- **FR4**: Send message with `Action = "Balances"` tag using `message()` function from aoconnect
- **FR5**: Retrieve message ID from message response
- **FR6**: Fetch result from CU_A using `result(messageId, processId, cuUrl)` 
- **FR7**: Fetch result from CU_B using `result(messageId, processId, cuUrl)`
- **FR8**: Extract balance objects from `Output.data` property of each result
- **FR9**: Parse JSON balance data (format: `{"address1": "balance1", "address2": "balance2", ...}`)
- **FR10**: Compare balances address-by-address
- **FR11**: Output detailed comparison report showing:
  - Total addresses found in each CU
  - Addresses unique to CU_A
  - Addresses unique to CU_B
  - Addresses with matching balances
  - Addresses with mismatched balances
  - Statistical summary (accuracy percentage, total discrepancy)
- **FR12**: Support default CU pairs (ardrive.io vs ao-testnet.xyz)
- **FR13**: Handle cases where one CU returns addresses the other doesn't
- **FR14**: Support wallet file path configuration

### Technical Requirements
- **TR1**: Use `@permaweb/aoconnect` `message()` and `result()` functions (not `dryrun`)
- **TR2**: Parse JWK wallet from JSON file
- **TR3**: Support CU URL configuration via environment variables and CLI arguments
- **TR4**: Handle API errors and timeouts gracefully
- **TR5**: Implement retry logic for network failures
- **TR6**: Support multiple output formats (console, JSON, CSV)
- **TR7**: TypeScript for type safety
- **TR8**: Share common utilities with existing balance-checker tool
- **TR9**: Parse and validate JSON balance data from `Output.data`
- **TR10**: Handle cases where `Output.data` might not be valid JSON

### Non-Functional Requirements
- **NFR1**: Performance - handle 5000+ addresses efficiently
- **NFR2**: Reliability - automatic retry with exponential backoff
- **NFR3**: Maintainability - modular code structure leveraging existing architecture
- **NFR4**: Usability - intuitive CLI interface with sensible defaults
- **NFR5**: Extensibility - easy to add support for additional CU comparisons

## Proposed Solutions

### Solution 1: Standalone CLI Tool

**Architecture**:
- New independent CLI tool in the same repository
- Separate entry point (`cu-compare.ts`)
- Reuses existing modules (config, types, comparator, reporter)
- New `CUClient` class for CU-specific operations
- Separate binary: `cu-compare`

**Implementation**:
```
src/
  cu-compare.ts        # New CLI entry point
  cuClient.ts          # New CU client (similar to aoClient)
  cuComparator.ts      # New CU-specific comparison logic
  [existing files...]  # Reuse config, types, reporter, etc.
```

**Pros**:
- Clean separation of concerns
- No impact on existing balance-checker functionality
- Easy to distribute as separate tool
- Clear user experience (different commands for different tasks)
- Simpler testing and debugging

**Cons**:
- Code duplication for CLI setup
- Two separate binaries to maintain
- Users need to know about two different tools
- Slightly more package.json configuration

**Estimated Complexity**: Low-Medium (2-3 days)

### Solution 2: Unified CLI with Subcommands

**Architecture**:
- Single CLI with subcommands: `balance-checker compare-hyperbeam` and `balance-checker compare-cu`
- Shared entry point with command routing
- Unified configuration system
- Shared utilities across all commands

**Implementation**:
```
src/
  cli.ts                    # Main CLI with subcommand routing
  commands/
    compareHyperbeam.ts     # Existing functionality
    compareCU.ts            # New CU comparison
  clients/
    aoClient.ts
    hyperbeamClient.ts
    cuClient.ts             # New
  [other shared modules...]
```

**Pros**:
- Single tool to learn and use
- Unified configuration and options
- Shared code maximizes reuse
- Professional CLI structure (like git, npm, etc.)
- Easier to add future comparison types
- Single binary to install and distribute

**Cons**:
- More refactoring of existing code required
- Slightly more complex CLI routing logic
- Breaking change for existing users (command becomes subcommand)
- Longer command invocations

**Estimated Complexity**: Medium (4-5 days)

### Solution 3: Hybrid - Mode Flag Approach

**Architecture**:
- Single CLI with `--mode` flag
- Mode values: `hyperbeam` (default), `cu-compare`
- Conditional logic based on mode
- Shared infrastructure with mode-specific branches

**Implementation**:
```
src/
  cli.ts                # Main CLI with mode flag
  modes/
    hyperbeamMode.ts    # Existing functionality
    cuCompareMode.ts    # New CU comparison
  [shared modules...]
```

**Pros**:
- Minimal changes to existing CLI
- Backward compatible (default mode preserves existing behavior)
- Single binary
- Easy to understand flag-based selection
- Moderate code reuse

**Cons**:
- Flag-based routing less intuitive than subcommands
- Can become messy with many modes
- CLI help becomes more complex
- Not as clean as dedicated subcommands
- Awkward for future extensibility

**Estimated Complexity**: Medium (3-4 days)

## Selected Solution: Solution 1 - Standalone CLI Tool

### Rationale

**Why Solution 1**:
1. **Minimal Disruption**: No changes to existing working balance-checker tool
2. **Clear Separation**: Two distinct use cases warrant separate tools
3. **Faster Implementation**: No refactoring required, can reuse existing modules as-is
4. **Easier Testing**: Independent testing without affecting existing functionality
5. **User Clarity**: Clear distinction between comparing against Hyperbeam vs comparing CUs
6. **Risk Mitigation**: No risk of breaking existing functionality
7. **Deployment Flexibility**: Can deploy/update tools independently

**Why Not Solution 2**:
- Requires significant refactoring of existing working code
- Breaking change for existing users
- Higher development time not justified for current needs
- More complex testing matrix

**Why Not Solution 3**:
- Flag-based selection is less intuitive than separate tools
- Becomes unwieldy as more comparison types are added
- Doesn't scale well architecturally

### Future Considerations
If we add 3+ comparison types in the future, we can consolidate into Solution 2 (subcommand architecture) at that point. For now, two focused tools provide the best user experience.

## Implementation Steps

### Phase 1: Project Setup (Day 1)

1. **Add CU Compare Configuration**:
   - Add CU_URL_A and CU_URL_B to .env
   - Create cuCompare section in types.ts
   - Extend Config interface

2. **Create CU Client Module** (`src/cuClient.ts`):
   - Create `CUClient` class
   - Implement `sendBalanceMessage(processId, wallet)` - sends message with Action="Balances"
   - Implement `getResultFromCU(messageId, processId, cuUrl)` - fetches result from specific CU
   - Parse `Output.data` as JSON to extract balance object
   - Add CU-specific error handling
   - Validate wallet JWK format

3. **Update package.json**:
   - Add new binary entry: `cu-compare`
   - Update scripts to support both tools

### Phase 2: Core Comparison Logic (Day 2)

1. **Create CU Comparator** (`src/cuComparator.ts`):
   - Accept two balance objects (Record<address, balance>)
   - Identify addresses only in CU_A
   - Identify addresses only in CU_B
   - Compare balances for common addresses using BigInt
   - Calculate statistics (accuracy, discrepancy)
   - Handle edge cases (empty objects, malformed data)

2. **Define CU-Specific Types** (extend `src/types.ts`):
   ```typescript
   export interface CUComparisonResult {
     address: string;
     cuABalance?: string;
     cuBBalance?: string;
     match: boolean;
     onlyInA: boolean;
     onlyInB: boolean;
     difference?: string;
   }

   export interface CUComparisonReport {
     processId: string;
     cuAUrl: string;
     cuBUrl: string;
     totalAddressesA: number;
     totalAddressesB: number;
     commonAddresses: number;
     onlyInA: number;
     onlyInB: number;
     matchingCount: number;
     mismatchCount: number;
     accuracyPercentage: number;
     totalDiscrepancy: string;
     mismatches: CUComparisonResult[];
     matches: CUComparisonResult[];
     uniqueToA: CUComparisonResult[];
     uniqueToB: CUComparisonResult[];
     timestamp: string;
   }
   ```

### Phase 3: CLI Implementation (Day 3)

1. **Create CU Compare CLI** (`src/cu-compare.ts`):
   ```typescript
   #!/usr/bin/env node
   import { Command } from 'commander';
   
   program
     .name('cu-compare')
     .description('Compare AO process balances between two CUs')
     .argument('<process-id>', 'AO process ID')
     .option('-a, --cu-a <url>', 'First CU URL', 'https://cu.ardrive.io')
     .option('-b, --cu-b <url>', 'Second CU URL', 'https://cu.ao-testnet.xyz')
     .option('-w, --wallet <path>', 'Path to wallet JWK file', 'demo.json')
     .option('-o, --output <format>', 'Output format: console, json, csv', 'console')
     .option('-f, --file <path>', 'Output file path')
     .option('--max-addresses <number>', 'Maximum addresses to check')
     .option('-v, --verbose', 'Verbose output')
   ```

2. **Implement CLI Logic**:
   - Parse arguments
   - Load wallet JWK from file
   - Load configuration
   - Validate inputs (process ID, CU URLs, wallet)
   - Send balance message to get message ID
   - Fetch results from both CUs using message ID
   - Parse balance data from Output.data
   - Execute comparison
   - Generate report

### Phase 4: Reporting (Day 4)

1. **Extend Reporter** (`src/reporter.ts`):
   - Add `generateCUComparisonReport()` method
   - Console format with sections:
     - Summary statistics
     - Addresses unique to CU_A
     - Addresses unique to CU_B
     - Mismatched balances
     - Color-coded output
   - JSON export format
   - CSV export format

2. **Report Sections**:
   ```
   CU BALANCE COMPARISON REPORT
   ═══════════════════════════════════════════
   
   CU A: https://cu.ardrive.io
   CU B: https://cu.ao-testnet.xyz
   Process: qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
   
   SUMMARY:
   Total Addresses (CU A): 5797
   Total Addresses (CU B): 5795
   Common Addresses: 5790
   Only in CU A: 7
   Only in CU B: 5
   Matching Balances: 5780
   Mismatched Balances: 10
   Accuracy: 99.83%
   
   UNIQUE TO CU A:
   [List addresses only in CU A]
   
   UNIQUE TO CU B:
   [List addresses only in CU B]
   
   MISMATCHED BALANCES:
   [List mismatches with both values]
   ```

### Phase 5: Testing & Polish (Day 5)

1. **Manual Testing**:
   - Test with cu.ardrive.io vs cu.ao-testnet.xyz
   - Test with same CU (should show 100% match)
   - Test with non-existent process
   - Test with invalid CU URLs
   - Test all output formats

2. **Error Handling**:
   - Network failures
   - Invalid process IDs
   - CU timeouts
   - Malformed responses

3. **Documentation**:
   - Update main README
   - Create CU_COMPARE.md usage guide
   - Add examples
   - Document differences from balance-checker

### Phase 6: Integration (Day 6)

1. **Build Configuration**:
   - Update tsconfig paths
   - Configure build outputs
   - Test binary generation

2. **Environment Setup**:
   - Update .env.example
   - Document CU configuration
   - Provide sensible defaults

3. **User Documentation**:
   - Installation instructions
   - Quick start guide
   - Common use cases
   - Troubleshooting

## Success Criteria

### Functional Success Criteria

- ✅ **SC1**: Successfully queries balances from two different CUs
- ✅ **SC2**: Correctly identifies addresses unique to each CU
- ✅ **SC3**: Accurately compares balances for common addresses
- ✅ **SC4**: Generates comprehensive report with all required sections
- ✅ **SC5**: Supports default CU URLs (ardrive.io and ao-testnet.xyz)
- ✅ **SC6**: Handles missing addresses gracefully

### Performance Success Criteria

- ✅ **SC7**: Processes 1000 addresses in under 30 seconds
- ✅ **SC8**: Handles 5000+ addresses without memory issues
- ✅ **SC9**: Implements retry logic with 3 attempts
- ✅ **SC10**: Completes within 2 minutes for typical processes

### Quality Success Criteria

- ✅ **SC11**: Zero crashes on valid input
- ✅ **SC12**: Clear error messages for all failure scenarios
- ✅ **SC13**: Accurate difference calculations using BigInt
- ✅ **SC14**: CLI help documentation is complete
- ✅ **SC15**: TypeScript compilation with no errors

### Usability Success Criteria

- ✅ **SC16**: Single command execution with sensible defaults
- ✅ **SC17**: Default comparison: `cu-compare <process-id>` uses ardrive vs ao-testnet
- ✅ **SC18**: Custom CUs: `cu-compare <process-id> -a <url> -b <url>`
- ✅ **SC19**: Report clearly distinguishes between types of discrepancies
- ✅ **SC20**: Installation takes under 5 minutes

### Integration Success Criteria

- ✅ **SC21**: Works alongside existing balance-checker tool
- ✅ **SC22**: Shares configuration where appropriate
- ✅ **SC23**: Consistent CLI argument patterns with balance-checker
- ✅ **SC24**: Same output format structure as balance-checker

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| CU response format differences | Medium | High | Implement flexible parsing, schema validation |
| One CU slower than the other | High | Medium | Independent timeouts, progress indicators |
| CU rate limiting | Medium | Medium | Implement backoff, configurable delays |
| Large address set differences | Low | Low | Clear reporting, handle edge cases |
| Network instability | Medium | Medium | Retry logic, timeout configuration |
| CU endpoints change structure | Low | High | Version detection, graceful degradation |

## Implementation Details

### Technical Flow

**Step-by-step execution flow**:

1. **Load Wallet**:
   ```typescript
   const wallet = JSON.parse(fs.readFileSync('demo.json', 'utf-8'));
   ```

2. **Send Balance Message**:
   ```typescript
   import { message } from '@permaweb/aoconnect';
   
   const messageId = await message({
     process: processId,
     tags: [{ name: 'Action', value: 'Balances' }],
     signer: createDataItemSigner(wallet),
     data: ''
   });
   ```

3. **Fetch Result from CU A**:
   ```typescript
   import { result } from '@permaweb/aoconnect';
   
   const resultA = await result({
     message: messageId,
     process: processId,
     cuUrl: 'https://cu.ardrive.io'
   });
   
   const balancesA = JSON.parse(resultA.Output.data);
   // balancesA = { "addr1": "1000", "addr2": "2000", ... }
   ```

4. **Fetch Result from CU B**:
   ```typescript
   const resultB = await result({
     message: messageId,
     process: processId,
     cuUrl: 'https://cu.ao-testnet.xyz'
   });
   
   const balancesB = JSON.parse(resultB.Output.data);
   ```

5. **Compare Balance Objects**:
   ```typescript
   const allAddresses = new Set([
     ...Object.keys(balancesA),
     ...Object.keys(balancesB)
   ]);
   
   for (const address of allAddresses) {
     const balA = balancesA[address];
     const balB = balancesB[address];
     
     if (!balA) {
       // Only in CU B
     } else if (!balB) {
       // Only in CU A
     } else if (balA !== balB) {
       // Mismatch
     } else {
       // Match
     }
   }
   ```

### Key Differences from balance-checker

| Aspect | balance-checker | cu-compare |
|--------|----------------|------------|
| **AO Function** | `dryrun()` | `message()` + `result()` |
| **Authentication** | None (read-only) | Requires wallet signer |
| **Message ID** | Not used | Critical - used to fetch from both CUs |
| **Data Path** | `Messages[0].Data` | `Output.data` |
| **CU Specification** | Uses default CU | Explicitly specifies CU URL |
| **Result Format** | Direct JSON in Data | JSON string in Output.data |

### Code Reuse Strategy

**Modules to Reuse**:
1. `config.ts` - Extend for CU URLs
2. `types.ts` - Add CU-specific types
3. `comparator.ts` - Reuse balance comparison logic
4. `reporter.ts` - Extend for CU report format
5. Common utilities - Error handling, validation

**New Modules**:
1. `cuClient.ts` - CU-specific client (minimal, wraps aoConnect)
2. `cuComparator.ts` - CU-to-CU comparison logic
3. `cu-compare.ts` - CLI entry point

### Configuration Strategy

**.env variables**:
```env
# Existing
CU_URL=https://cu.ardrive.io
HYPERBEAM_BASE_URL=https://state-2.forward.computer

# New for CU comparison
CU_URL_A=https://cu.ardrive.io
CU_URL_B=https://cu.ao-testnet.xyz
WALLET_PATH=./demo.json
```

**CLI precedence**: CLI args > Environment variables > Defaults

### Error Handling Strategy

1. **CU-Specific Errors**:
   - CU unreachable: Retry with exponential backoff
   - CU timeout: Clear error message, suggest increasing timeout
   - CU returns empty: Report as "0 addresses found"
   - CU returns malformed data: Log error, attempt parsing

2. **Comparison Errors**:
   - One CU fails: Report partial results if available
   - Both CUs fail: Clear error message, suggest checking endpoints
   - Process doesn't exist: Inform user, suggest verification

3. **Validation Errors**:
   - Invalid process ID: Clear format requirements
   - Invalid CU URL: URL format validation
   - Invalid options: Show help text

## Future Enhancements

### Short-term (v1.1-1.2)

1. **Historical Comparison**: Store previous comparison results
2. **Watch Mode**: Continuous monitoring of CU sync
3. **Multiple Process Support**: Compare multiple processes in one run
4. **Diff Export**: Git-style diff output format
5. **Email Alerts**: Notify on significant discrepancies

### Long-term (v2.0+)

1. **CU Health Dashboard**: Web UI showing CU comparison over time
2. **N-way Comparison**: Compare 3+ CUs simultaneously
3. **Automatic Discovery**: Auto-detect available CU endpoints
4. **Smart Routing**: Recommend best CU based on consistency
5. **Integration Tests**: Automated CU consistency checks in CI/CD
6. **GraphQL API**: Query comparison data programmatically

## Comparison with Existing Tool

| Feature | balance-checker | cu-compare |
|---------|----------------|------------|
| **Primary Use** | Validate against Hyperbeam | Compare between CUs |
| **Data Sources** | AO + Hyperbeam | CU A + CU B |
| **Main Purpose** | State validation | Sync verification |
| **Address Handling** | All from AO | Union of both CUs |
| **Report Focus** | Mismatches | Mismatches + unique addresses |
| **Performance** | ~2min for 1000 | ~30sec for 1000 |
| **Concurrency** | High (15+ default) | Sequential/Low (safer) |

## Dependencies

### New Dependencies
None - fully reuses existing dependencies:
- `@permaweb/aoconnect` ✅ (already installed)
- `axios` ✅ (already installed)
- `commander` ✅ (already installed)
- `chalk` ✅ (already installed)
- `dotenv` ✅ (already installed)
- `p-limit` ✅ (already installed)
- `cli-progress` ✅ (already installed)

### Dependency Rationale
- **Zero new dependencies**: Maximizes stability and minimizes bundle size
- **Proven stack**: All dependencies already tested in balance-checker
- **TypeScript**: Type safety across both tools

## Deployment Strategy

### Build Process
```bash
npm run build
# Generates:
# - dist/cli.js (balance-checker)
# - dist/cu-compare.js (cu-compare)
```

### Installation
```bash
npm install
npm run build
npm link  # Creates both binaries
```

### Distribution
- **Option 1**: Two separate npm packages
- **Option 2**: Single package with two binaries (recommended)
- **Option 3**: Scoped package: `@ao/balance-tools`

## Testing Strategy

### Manual Testing Scenarios

1. **Basic Comparison**:
   ```bash
   cu-compare qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
   ```

2. **Custom CUs**:
   ```bash
   cu-compare <process> -a https://cu1.example.com -b https://cu2.example.com
   ```

3. **Output Formats**:
   ```bash
   cu-compare <process> -o json -f comparison.json
   cu-compare <process> -o csv -f comparison.csv
   ```

4. **Limited Testing**:
   ```bash
   MAX_ADDRESSES=100 cu-compare <process>
   ```

### Edge Cases
- Process with no balances
- Process with single address
- Process with 10k+ addresses
- One CU missing addresses
- Both CUs have different address sets
- Network failures during comparison
- Invalid process ID
- Malformed CU responses
- Invalid wallet file
- Missing wallet file
- Output.data is not valid JSON
- Output.data is empty or missing
- Message ID not returned
- CU doesn't have the message result yet

### Integration Testing
- Run both tools consecutively
- Verify shared configuration works
- Test with same process on both tools
- Verify no interference between tools

## Documentation Deliverables

1. **CU_COMPARE.md**: Dedicated usage guide
2. **README.md updates**: Add cu-compare section
3. **API documentation**: JSDoc comments
4. **Examples**: 5+ real-world scenarios
5. **Troubleshooting guide**: Common issues and solutions

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Setup | 1 day | Project structure, CU client |
| Phase 2: Comparison Logic | 1 day | CU comparator, types |
| Phase 3: CLI | 1 day | Command-line interface |
| Phase 4: Reporting | 1 day | Report generation |
| Phase 5: Testing | 1 day | Manual testing, bug fixes |
| Phase 6: Integration | 1 day | Documentation, polish |
| **Total** | **6 days** | **Production-ready tool** |

## Exit Criteria

Project is considered complete when:

1. ✅ All 24 success criteria met
2. ✅ Both cu.ardrive.io and cu.ao-testnet.xyz tested successfully
3. ✅ Documentation complete and reviewed
4. ✅ Integration with existing tool verified
5. ✅ Zero known critical bugs
6. ✅ Performance targets achieved
7. ✅ User acceptance testing passed

---

**Status**: Ready for Implementation  
**Priority**: Medium  
**Estimated Effort**: 6 days  
**Risk Level**: Low
