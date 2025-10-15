# Project Request Protocol: Balance Checker CLI

## Project Overview

### Purpose
Develop a CLI tool that validates AO process balances by comparing data from two sources:
1. Direct AO process query via `@permaweb/aoconnect` dryrun feature
2. Hyperbeam process API at `compute/balances/{address}`

The tool will identify discrepancies and generate a comprehensive comparison report.

### Scope
- Query AO process balances using dryrun with configurable CU_URL
- Fetch corresponding balances from Hyperbeam process
- Compare balances for each address
- Generate detailed mismatch report and summary statistics

## Technical Requirements

### Functional Requirements
- **FR1**: Accept AO process ID as input parameter
- **FR2**: Execute dryrun call with `Action = "Balances"` to retrieve address list
- **FR3**: Configure CU_URL via environment variable
- **FR4**: Query Hyperbeam API for each address: `compute/balances/{address}`
- **FR5**: Compare balances from both sources
- **FR6**: Output report showing:
  - Mismatched balances (address, AO balance, Hyperbeam balance, difference)
  - Summary of total addresses checked
  - Count of matching vs mismatching balances
  - Statistical summary (total discrepancy amount, percentage accuracy)

### Technical Requirements
- **TR1**: Use `@permaweb/aoconnect` package for AO interaction
- **TR2**: Support CU_URL configuration via environment variables
- **TR3**: Handle API rate limiting and errors gracefully
- **TR4**: Implement concurrent requests with appropriate throttling
- **TR5**: Support multiple output formats (console, JSON, CSV)
- **TR6**: Node.js runtime compatibility
- **TR7**: TypeScript for type safety

### Non-Functional Requirements
- **NFR1**: Performance - handle 1000+ addresses efficiently
- **NFR2**: Reliability - implement retry logic for network failures
- **NFR3**: Maintainability - clear code structure and documentation
- **NFR4**: Usability - intuitive CLI interface with helpful error messages

## Proposed Solutions

### Solution 1: Simple Sequential Processing

**Architecture**:
- Single-threaded sequential execution
- Fetch all balances from AO process first
- Query Hyperbeam API one address at a time
- Compare and generate report

**Implementation**:
```
1. Load config from env
2. Dryrun AO process → get address list
3. For each address:
   a. Query Hyperbeam API
   b. Compare balances
   c. Store results
4. Generate report
```

**Pros**:
- Simplest to implement and debug
- No concurrency complexity
- Predictable resource usage
- Easy error handling

**Cons**:
- Slowest execution time for large address lists
- Poor network utilization
- Not suitable for 1000+ addresses
- User experience suffers with long wait times

**Estimated Complexity**: Low (2-3 days)

### Solution 2: Concurrent Batch Processing with Promise Pool

**Architecture**:
- Concurrent HTTP requests with configurable pool size
- Batch processing with Promise.allSettled
- Progressive result reporting
- Intelligent retry mechanism

**Implementation**:
```
1. Load config from env
2. Dryrun AO process → get address list
3. Create promise pool (configurable concurrency: 10-20)
4. Process addresses in batches:
   a. Fetch from Hyperbeam concurrently
   b. Compare as results arrive
   c. Update progress indicator
5. Aggregate results and generate report
```

**Pros**:
- 10-20x faster than sequential for large datasets
- Configurable concurrency prevents overwhelming APIs
- Good balance of complexity vs performance
- Handles partial failures gracefully with allSettled
- Progress feedback improves UX

**Cons**:
- More complex error handling
- Need to manage concurrency limits
- Potential for rate limiting issues
- Slightly higher memory usage

**Estimated Complexity**: Medium (4-5 days)

### Solution 3: Stream-Based Processing with Worker Threads

**Architecture**:
- Worker thread pool for parallel processing
- Stream-based data pipeline
- Real-time report generation
- Advanced queue management

**Implementation**:
```
1. Load config from env
2. Dryrun AO process → stream addresses
3. Initialize worker thread pool
4. Stream addresses to workers:
   a. Workers fetch from Hyperbeam
   b. Workers compare balances
   c. Results stream back to main thread
5. Real-time report updates
6. Final aggregation
```

**Pros**:
- Maximum performance for very large datasets (10k+ addresses)
- True parallel processing utilizing multiple CPU cores
- Minimal memory footprint with streaming
- Best scalability
- Real-time progress updates

**Cons**:
- Highest implementation complexity
- Over-engineered for typical use cases (<5000 addresses)
- More difficult debugging
- Worker thread overhead for small datasets
- Complex error propagation

**Estimated Complexity**: High (7-10 days)

## Selected Solution: Solution 2 - Concurrent Batch Processing

### Rationale

**Why Solution 2**:
1. **Performance**: Provides 10-20x speedup over sequential, adequate for requirements
2. **Complexity Balance**: Medium complexity with manageable implementation timeline
3. **Scalability**: Handles NFR1 (1000+ addresses) efficiently
4. **Reliability**: Promise.allSettled provides robust error handling
5. **Maintainability**: Standard patterns, no exotic constructs
6. **Resource Efficiency**: Better network utilization without CPU overhead of workers

**Why Not Solution 1**:
- Cannot meet NFR1 (performance for 1000+ addresses)
- Poor user experience with long sequential waits

**Why Not Solution 3**:
- Over-engineered for current requirements
- Extended development time not justified
- Can migrate to this if scaling needs increase

## Implementation Steps

### Phase 1: Project Setup (Day 1)
1. Initialize npm project with TypeScript
2. Install dependencies:
   - `@permaweb/aoconnect`
   - CLI framework (commander or yargs)
   - HTTP client (axios or node-fetch)
   - p-limit for concurrency control
3. Setup TypeScript config
4. Create project structure:
   ```
   src/
     cli.ts          # CLI interface
     config.ts       # Env config loader
     aoClient.ts     # AO process interaction
     hyperbeam.ts    # Hyperbeam API client
     comparator.ts   # Balance comparison logic
     reporter.ts     # Report generation
     types.ts        # Type definitions
   ```

### Phase 2: Core Functionality (Days 2-3)
1. **Config Module**: Load CU_URL and other env vars
2. **AO Client**: 
   - Implement dryrun call
   - Parse balance response
   - Extract address list
3. **Hyperbeam Client**:
   - Implement balance query
   - Add retry logic
   - Error handling
4. **Comparator**:
   - Balance comparison logic
   - Difference calculation
   - Result aggregation

### Phase 3: Concurrency & Performance (Day 4)
1. Implement promise pool with p-limit
2. Configure concurrency (default: 15 concurrent requests)
3. Add progress indicator
4. Batch processing logic
5. Performance testing and tuning

### Phase 4: Reporting (Day 5)
1. Console output formatter:
   - Mismatched balances table
   - Summary statistics
   - Color-coded output
2. JSON export option
3. CSV export option
4. Report validation

### Phase 5: CLI & Polish (Day 6)
1. CLI argument parsing
2. Help documentation
3. Error messages and validation
4. Input sanitization
5. Exit codes

### Phase 6: Testing & Documentation (Day 7)
1. Unit tests for core modules
2. Integration tests
3. README with usage examples
4. Error handling edge cases
5. Performance benchmarking

## Success Criteria

### Functional Success Criteria
- ✅ **SC1**: Successfully queries AO process and retrieves all balances
- ✅ **SC2**: Correctly fetches balances from Hyperbeam API for all addresses
- ✅ **SC3**: Accurately identifies balance mismatches with correct difference calculation
- ✅ **SC4**: Generates complete report with all required sections
- ✅ **SC5**: Supports CU_URL configuration via environment variable

### Performance Success Criteria
- ✅ **SC6**: Processes 1000 addresses in under 2 minutes
- ✅ **SC7**: Processes 100 addresses in under 15 seconds
- ✅ **SC8**: Handles network failures with automatic retry (3 attempts)
- ✅ **SC9**: Memory usage stays under 512MB for 5000 addresses

### Quality Success Criteria
- ✅ **SC10**: Zero crashes on valid input
- ✅ **SC11**: Clear error messages for all failure modes
- ✅ **SC12**: 90%+ code coverage with unit tests
- ✅ **SC13**: CLI help documentation complete and accurate
- ✅ **SC14**: TypeScript types provide full IDE support

### Usability Success Criteria
- ✅ **SC15**: Single command execution: `balance-checker <process-id>`
- ✅ **SC16**: Progress indicator shows real-time status
- ✅ **SC17**: Report is human-readable with clear formatting
- ✅ **SC18**: Supports export to JSON/CSV for further analysis
- ✅ **SC19**: Installation and setup complete in under 5 minutes

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Hyperbeam API rate limiting | Medium | High | Implement exponential backoff, configurable concurrency |
| AO process response format changes | Low | High | Version check, schema validation |
| Network instability | Medium | Medium | Retry logic, timeout configuration |
| Large address lists (10k+) memory issues | Low | Medium | Implement streaming if needed |
| Balance precision/formatting differences | Medium | Low | Normalize values, configurable precision |

## Future Enhancements

1. **Watch Mode**: Continuous monitoring with scheduled checks
2. **Webhooks**: Alert on balance mismatches
3. **Historical Tracking**: Store results in database for trend analysis
4. **Diff Visualization**: Interactive web dashboard
5. **Multi-Process Support**: Compare multiple AO processes simultaneously
6. **Smart Retry**: ML-based retry strategy for failed requests
7. **Cache Layer**: Cache Hyperbeam results to reduce API calls
