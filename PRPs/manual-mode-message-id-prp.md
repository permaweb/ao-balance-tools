# Project Request Protocol: Manual Mode with Message ID Override

## Project Overview

### Purpose
Add a manual mode to the balance-checker CLI that allows users to specify a pre-existing message ID to fetch balance data, bypassing the dryrun or wallet message sending steps. This enables validation of balances from a specific AO message result against the Hyperbeam API.

### Scope
- Add `--mode manual` option to CLI
- Add `--message-id` option to accept a specific AO message ID
- Use `ao.connect().result()` to fetch the message result from a CU
- Parse the message result data as the balance list
- Compare the fetched balances against Hyperbeam API
- Maintain compatibility with existing dryrun and wallet modes

### Use Case
Users who have already sent a balance query message to an AO process and want to validate the result without sending a new message. This is useful for:
- Auditing historical balance states
- Validating specific message results
- Debugging balance discrepancies at a point in time
- Reducing unnecessary messages to AO processes

## Technical Requirements

### Functional Requirements
- **FR1**: Accept `--mode manual` CLI argument
- **FR2**: Accept `--message-id <message-id>` CLI argument (required in manual mode)
- **FR3**: Fetch message result from CU using `result()` from `@permaweb/aoconnect`
- **FR4**: Parse message result data as balance dictionary (same format as dryrun/wallet)
- **FR5**: Compare balances against Hyperbeam API
- **FR6**: Generate standard comparison report
- **FR7**: Validate message ID format (43-character alphanumeric)
- **FR8**: Error gracefully if message result is not available or invalid

### Technical Requirements
- **TR1**: Extend `Mode` type to include `'manual'`
- **TR2**: Add message ID validation function
- **TR3**: Reuse existing CU client's `getResultFromCU()` method
- **TR4**: Reuse existing processor and comparator logic
- **TR5**: Handle CU_URL configuration from environment
- **TR6**: Support all existing output formats (console, JSON, CSV)

### Non-Functional Requirements
- **NFR1**: Minimal code duplication with existing modes
- **NFR2**: Clear error messages for invalid message IDs
- **NFR3**: Consistent CLI interface with existing modes
- **NFR4**: No breaking changes to existing functionality

## Proposed Solutions

### Solution 1: New ManualModeProcessor Class

**Architecture**:
- Create a dedicated `ManualModeProcessor` class
- Implement similar interface to `BalanceProcessor` and `WalletBalanceProcessor`
- Use `CUClient.getResultFromCU()` to fetch message result
- Process and compare balances using existing comparator

**Implementation**:
```typescript
class ManualModeProcessor {
  private cuClient: CUClient;
  private comparator: BalanceComparator;
  private config: Config;

  async validateAndProcess(processId: string, messageId: string, showProgress: boolean) {
    // Validate message ID
    // Fetch result from CU
    // Extract balances
    // Process with Hyperbeam comparison
    // Return comparisons
  }
}
```

**Pros**:
- Clean separation of concerns
- Follows existing pattern (separate classes per mode)
- Easy to test independently
- Clear code organization

**Cons**:
- Additional file and class to maintain
- Some code duplication with other processors
- Slight increase in bundle size
- Need to update CLI to instantiate correct processor

**Estimated Complexity**: Medium (2-3 days)

### Solution 2: Extend BalanceProcessor with Mode Logic

**Architecture**:
- Add manual mode handling to existing `BalanceProcessor` class
- Add conditional logic in `validateAndProcess()` and `processBalances()`
- Use strategy pattern to select balance fetching method based on mode

**Implementation**:
```typescript
class BalanceProcessor {
  async validateAndProcess(processId: string, showProgress: boolean, options?: {
    mode?: Mode;
    messageId?: string;
    wallet?: string;
  }) {
    if (options?.mode === 'manual') {
      return this.processManualMode(processId, options.messageId!, showProgress);
    }
    // existing logic
  }

  private async processManualMode(processId: string, messageId: string, showProgress: boolean) {
    // Manual mode implementation
  }
}
```

**Pros**:
- Minimal code changes
- Reuses existing processor infrastructure
- No new files needed
- Simplest migration path

**Cons**:
- Violates single responsibility principle
- Class becomes more complex with multiple modes
- Harder to test individual modes
- Mixing concerns in one class

**Estimated Complexity**: Low (1-2 days)

### Solution 3: Factory Pattern with Mode-Specific Strategies

**Architecture**:
- Create a `BalanceFetcher` interface
- Implement separate fetchers: `DryrunFetcher`, `WalletFetcher`, `ManualFetcher`
- Use factory pattern to instantiate correct fetcher based on mode
- Unified processor that delegates to appropriate fetcher

**Implementation**:
```typescript
interface BalanceFetcher {
  fetchBalances(processId: string, options?: any): Promise<AOBalanceResponse>;
}

class DryrunFetcher implements BalanceFetcher { ... }
class WalletFetcher implements BalanceFetcher { ... }
class ManualFetcher implements BalanceFetcher { ... }

class UnifiedBalanceProcessor {
  async validateAndProcess(processId: string, mode: Mode, options: any) {
    const fetcher = BalanceFetcherFactory.create(mode, this.config, options);
    const balances = await fetcher.fetchBalances(processId);
    // Continue with Hyperbeam comparison
  }
}
```

**Pros**:
- Excellent separation of concerns
- Easy to add new modes in the future
- Each strategy is independently testable
- Clean, maintainable architecture
- Follows SOLID principles

**Cons**:
- Requires refactoring existing code
- More files and abstractions
- Higher initial complexity
- Risk of breaking existing functionality

**Estimated Complexity**: High (4-5 days)

## Selected Solution: Solution 1 - New ManualModeProcessor Class

### Rationale

**Why Solution 1**:
1. **Consistency**: Follows the existing pattern established by `BalanceProcessor` and `WalletBalanceProcessor`
2. **Low Risk**: Doesn't modify existing working code
3. **Maintainability**: Clear separation makes it easy to understand and modify manual mode logic
4. **Testability**: Can be tested independently without affecting other modes
5. **Balance**: Good balance between complexity and maintainability
6. **Future-Proof**: If we need Solution 3 later, this is a good stepping stone

**Why Not Solution 2**:
- Violates single responsibility principle
- Makes the `BalanceProcessor` class too complex
- Harder to maintain as modes grow

**Why Not Solution 3**:
- Over-engineered for adding just one new mode
- Higher risk of breaking existing functionality
- Can refactor to this later if needed (multiple modes added)
- Higher time investment not justified by current requirements

## Implementation Steps

### Phase 1: Type Updates and Validation (Day 1, Morning)

1. **Update Type Definitions** (`src/types.ts`):
   - Extend `Mode` type: `export type Mode = 'dryrun' | 'wallet' | 'manual';`
   - Add optional `messageId` to `CLIOptions` interface

2. **Add Message ID Validation**:
   - Create `validateMessageId()` function (43-char alphanumeric)
   - Add to appropriate module (likely in `AOClient` or new util)

### Phase 2: ManualModeProcessor Implementation (Day 1, Afternoon - Day 2)

1. **Create ManualModeProcessor** (`src/manualProcessor.ts`):
   ```typescript
   export class ManualModeProcessor {
     private cuClient: CUClient;
     private comparator: BalanceComparator;
     private config: Config;

     constructor(config: Config);
     async validateAndProcess(
       processId: string,
       messageId: string,
       showProgress: boolean
     ): Promise<BalanceComparison[]>;
     private async processBalances(...): Promise<BalanceComparison[]>;
   }
   ```

2. **Implement Core Logic**:
   - Use `CUClient.getResultFromCU()` to fetch message result
   - Parse and validate balance data
   - Extract addresses using `BalanceComparator.extractAddresses()`
   - Process with Hyperbeam comparison (reuse existing logic)

3. **Error Handling**:
   - Invalid message ID format
   - Message not found on CU
   - Invalid data format in message
   - CU connection failures

### Phase 3: CLI Integration (Day 2, Afternoon)

1. **Update CLI Options** (`src/cli.ts`):
   - Add `--message-id <message-id>` option
   - Update mode validation to include `'manual'`
   - Add validation: message-id required when mode is manual

2. **Processor Selection Logic**:
   ```typescript
   if (mode === 'manual') {
     if (!options.messageId) {
       reporter.printError(new Error('--message-id required for manual mode'));
       process.exit(1);
     }
     processor = new ManualModeProcessor(config);
     comparisons = await processor.validateAndProcess(
       processId,
       options.messageId,
       options.progress
     );
   } else if (mode === 'wallet') {
     // existing wallet logic
   } else {
     // existing dryrun logic
   }
   ```

3. **CLI Help Documentation**:
   - Update help text to include manual mode
   - Add usage examples in help output

### Phase 4: Testing (Day 3, Morning)

1. **Unit Tests** (`tests/manualProcessor.test.ts`):
   - Message ID validation
   - Successful balance fetch and comparison
   - Error cases (invalid message ID, message not found, etc.)
   - Mock CU client responses

2. **Integration Tests**:
   - End-to-end manual mode flow
   - CLI argument parsing
   - Output format validation

3. **Edge Cases**:
   - Empty balance data
   - Malformed JSON in message data
   - CU timeout handling
   - Invalid process ID with manual mode

### Phase 5: Documentation and Polish (Day 3, Afternoon)

1. **Update README**:
   - Add manual mode section
   - Include usage examples
   - Document --message-id option

2. **Update CLI Help**:
   - Clear description of manual mode
   - Example command: `balance-checker --mode manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs`

3. **Error Messages**:
   - Review all error messages for clarity
   - Add helpful hints for common mistakes

4. **Code Comments**:
   - Document ManualModeProcessor class
   - Add JSDoc comments for public methods

## Success Criteria

### Functional Success Criteria
- ✅ **SC1**: CLI accepts `--mode manual` argument
- ✅ **SC2**: CLI accepts and validates `--message-id` argument
- ✅ **SC3**: Message ID validation correctly identifies valid/invalid IDs
- ✅ **SC4**: Successfully fetches message result from CU using provided message ID
- ✅ **SC5**: Correctly parses balance data from message result
- ✅ **SC6**: Compares balances against Hyperbeam API accurately
- ✅ **SC7**: Generates standard comparison report for manual mode
- ✅ **SC8**: Errors gracefully when message ID not found
- ✅ **SC9**: All existing modes (dryrun, wallet) continue to work unchanged

### Quality Success Criteria
- ✅ **SC10**: Zero breaking changes to existing functionality
- ✅ **SC11**: Clear, helpful error messages for all failure modes
- ✅ **SC12**: 80%+ code coverage for new ManualModeProcessor
- ✅ **SC13**: README includes manual mode usage examples
- ✅ **SC14**: CLI help text clearly documents manual mode

### Usability Success Criteria
- ✅ **SC15**: Single command execution: `balance-checker --mode manual --message-id <id> <process-id>`
- ✅ **SC16**: Short form available: `balance-checker -m manual --message-id <id> <process-id>`
- ✅ **SC17**: Supports all output formats (console, JSON, CSV)
- ✅ **SC18**: Clear validation error if message-id missing in manual mode
- ✅ **SC19**: Progress bar works correctly in manual mode

### Performance Success Criteria
- ✅ **SC20**: Manual mode faster than dryrun/wallet (no message sending)
- ✅ **SC21**: Comparable performance to existing modes for Hyperbeam comparisons

## Technical Specifications

### CLI Argument Structure

```bash
# Manual mode with message ID
balance-checker --mode manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# Short form
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs

# With output options
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -o json -f report.json

# With concurrency and verbose
balance-checker -m manual --message-id UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs -c 20 -v
```

### Message ID Validation

```typescript
function validateMessageId(messageId: string): boolean {
  if (!messageId || messageId.trim().length === 0) {
    return false;
  }
  if (messageId.length !== 43) {
    return false;
  }
  const validChars = /^[a-zA-Z0-9_-]+$/;
  return validChars.test(messageId);
}
```

### Data Flow

```
User Input (CLI)
    ↓
CLI Parser (--mode manual --message-id <id>)
    ↓
ManualModeProcessor.validateAndProcess()
    ↓
Validate Message ID Format
    ↓
CUClient.getResultFromCU(messageId, processId, cuUrl)
    ↓
Parse Message Result Data → AOBalanceResponse
    ↓
Extract Addresses from Balance Data
    ↓
For Each Address (Concurrent):
    ↓
    HyperbeamClient.getBalance(address)
    ↓
    BalanceComparator.compareBalances()
    ↓
Aggregate Results
    ↓
Generate Comparison Report
    ↓
Reporter.generateReport(report, format, file)
```

### Error Scenarios

| Error Scenario | Error Message | Exit Code |
|----------------|---------------|-----------|
| Missing --message-id in manual mode | `--message-id required for manual mode` | 1 |
| Invalid message ID format | `Invalid message ID format: {id}. Expected 43-character alphanumeric string.` | 1 |
| Message not found on CU | `Message {id} not found on CU: {cuUrl}` | 1 |
| Invalid data format in message | `Invalid balance data format in message {id}: expected object` | 1 |
| CU connection failure | `Failed to get result from CU {cuUrl}: {error}` | 1 |
| Invalid process ID | `Invalid process ID format: {id}. Expected 43-character alphanumeric string.` | 1 |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Message ID not found on CU | Medium | Low | Clear error message, retry logic in CUClient |
| Inconsistent data format between modes | Low | Medium | Validate data format, use common types |
| CU_URL not configured | Low | High | Validate config on startup, clear error message |
| Breaking existing modes | Low | High | Comprehensive testing, no changes to existing classes |
| Message result not yet available | Medium | Low | Retry logic, clear timeout error message |
| Users confuse message ID with process ID | Medium | Low | Clear validation error messages |

## Future Enhancements

1. **Auto-detect Mode**: If message-id looks like a message ID, auto-select manual mode
2. **Message Metadata Display**: Show message timestamp, sender in verbose mode
3. **Historical Comparison**: Compare multiple message IDs over time
4. **Batch Manual Mode**: Accept multiple message IDs for comparison
5. **Interactive Mode**: Let user browse recent messages and select one
6. **Cache Message Results**: Store message results locally to avoid re-fetching
7. **Diff Visualization**: Show what changed between two message IDs

## Dependencies

### Existing Dependencies (No Changes)
- `@permaweb/aoconnect` - Already used for `result()` function
- `p-limit` - Concurrent processing
- `cli-progress` - Progress bar
- `commander` - CLI parsing

### New Code Files
- `src/manualProcessor.ts` - ManualModeProcessor implementation
- `tests/manualProcessor.test.ts` - Unit tests

### Modified Files
- `src/types.ts` - Add `'manual'` to Mode type, add messageId to CLIOptions
- `src/cli.ts` - Add --message-id option, processor selection logic
- `README.md` - Document manual mode usage

## Validation Plan

### Manual Testing Checklist

- [ ] Run manual mode with valid message ID and process ID
- [ ] Verify balance comparison against Hyperbeam works
- [ ] Test with invalid message ID format
- [ ] Test with message ID that doesn't exist
- [ ] Test with invalid process ID in manual mode
- [ ] Test all output formats (console, JSON, CSV)
- [ ] Test with concurrency option
- [ ] Test with verbose option
- [ ] Test with progress disabled
- [ ] Verify dryrun mode still works
- [ ] Verify wallet mode still works
- [ ] Test error messages are clear and helpful

### Automated Testing

- [ ] Unit tests for message ID validation
- [ ] Unit tests for ManualModeProcessor.validateAndProcess()
- [ ] Unit tests for balance fetching from message result
- [ ] Integration test: manual mode end-to-end
- [ ] Integration test: existing modes unchanged
- [ ] Test coverage ≥ 80% for new code

## Timeline Summary

- **Day 1 Morning**: Type updates, validation function
- **Day 1 Afternoon - Day 2 Morning**: ManualModeProcessor implementation
- **Day 2 Afternoon**: CLI integration
- **Day 3 Morning**: Testing
- **Day 3 Afternoon**: Documentation and polish

**Total Estimated Time**: 3 days

## Acceptance Criteria Checklist

- [ ] CLI accepts `--mode manual` and `--message-id <id>` arguments
- [ ] Message ID is validated (43-char alphanumeric)
- [ ] Message result is fetched from CU using provided message ID
- [ ] Balances are correctly parsed from message result
- [ ] Balances are compared against Hyperbeam API
- [ ] Standard comparison report is generated
- [ ] All output formats work (console, JSON, CSV)
- [ ] Clear error messages for all failure modes
- [ ] Existing modes (dryrun, wallet) unchanged and working
- [ ] Unit tests written with ≥80% coverage
- [ ] README updated with manual mode usage
- [ ] CLI help text updated
- [ ] Manual testing checklist completed
