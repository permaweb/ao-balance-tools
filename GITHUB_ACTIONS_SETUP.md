# GitHub Actions Setup Guide: Automated Balance Checking

This guide explains how to set up the automated balance-checker workflow that runs every 30 minutes.

## Overview

The workflow (`.github/workflows/check-balances.yml`) automatically checks balances for multiple AO processes every 30 minutes using the balance-checker tool in **wallet mode**.

The workflow reads process IDs from `processes.txt`, making it easy to add or remove processes without modifying the workflow file.

### Key Features

- ⏰ Runs every 30 minutes (configurable via cron expression)
- 🔐 Uses wallet authentication for secure balance queries
- 📊 Generates JSON reports for each process
- 📦 Stores reports as artifacts for 30 days
- 🚀 Can be manually triggered via GitHub UI
- ✅ Continues checking all processes even if one fails
- 📝 Process list managed via `processes.txt` (no workflow edits needed)

## Prerequisites

1. Repository must have GitHub Actions enabled (default for public repos)
2. You need to set up GitHub Secrets

## Setup Instructions

### Step 1: processes.txt is Already Configured ✓

Your `processes.txt` already contains the three processes:
```
Jc2bcfEbwHFQ-qY4jqm8L5hc-SggeVA1zlW6DOICWgo
K59Wi9uKXBQfTn3zw7L_t-lwHAoq3Fx-V9sCyOY3dFE
s6jcB3ctSbiDNwR-paJgy5iOAhahXahLul8exSLHbGE
```

To add/remove processes in the future, just edit `processes.txt` (one ID per line, comments start with `#`).

### Step 2: Add Required Secret

Go to your repository settings: **Settings → Secrets and variables → Actions**

#### Preparing WALLET_JSON Secret (Base64-encoded)

First, encode your wallet JSON as base64. Run this command in your terminal:

```bash
cat your-wallet.json | base64
```

This will output a long base64 string. Copy this entire string.

Then add this **Secret** to your repository:

| Secret Name | Description |
|---|---|
| `WALLET_JSON` | Base64-encoded Arweave wallet JSON (output from `cat wallet.json \| base64`) |

**Example:**
```
WALLET_JSON = eyJrdHkiOiJSU0EiLCJuIjoiMzI0MjIzNDIzNDIzNDI0MjM0MjQyNDI0Mg...
```

**Note:** 
- The CU URL is hardcoded as `https://cu.ao-testnet.xyz`
- The `HYPERBEAM_BASE_URL` secret is optional if you want to use a custom Hyperbeam endpoint

**Why base64?** It safely encodes the entire JSON including special characters, newlines, and curly braces without GitHub secret parsing issues.

### Step 3 (Optional): Add Optional Variables

Go to **Settings → Secrets and variables → Actions** and create **Variables**:

| Variable Name | Default | Description |
|---|---|---|
| `CONCURRENCY` | 15 | Number of concurrent requests |
| `RETRY_ATTEMPTS` | 3 | Number of retry attempts |

### Step 4 (Optional): Change the Schedule

Edit `.github/workflows/check-balances.yml` to change the cron expression:

```yaml
on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
    # or
    - cron: '0 0 * * *'    # Daily at midnight UTC
    # or
    - cron: '*/15 * * * *'  # Every 15 minutes
```

For cron syntax help, visit: https://crontab.guru/

### Step 3: Verify Setup

1. Go to your repository's **Actions** tab
2. You should see "Check Process Balances" workflow
3. Click **Run workflow** to test it manually
4. After the first manual run, the workflow will automatically run every 30 minutes

## Workflow Output

### Reports
Each successful check generates a JSON report with the first 8 characters of the process ID:
- `balance-report-xU9zFkq3.json`
- `balance-report-qNvAoz0T.json`
- `balance-report-yAbC123D.json`

These are stored as artifacts and can be downloaded from the Actions run page.

### Summary
A summary is posted to the GitHub run page showing:
- ✓ or ✗ status for each process check
- Link to download detailed reports
- Timestamp of the check

## Monitoring

### View Results
1. Go to **Actions → Check Process Balances**
2. Click on a workflow run
3. View the summary and download reports

### Track History
- Artifacts are kept for 30 days (configurable in workflow)
- You can track balance trends over time by analyzing archived reports
- Failed runs show detailed error logs

## Troubleshooting

### Workflow not triggering automatically
- Check that Actions is enabled: **Settings → Actions → General**
- Verify the repository has activity (schedules require at least one push to the default branch)
- Wait up to 1 hour after first push for scheduled workflows to activate

### "Wallet file not found" error
- Ensure `WALLET_JSON` secret is set correctly
- The secret should be the complete JSON content (not a file path)

### No processes are being checked
- Verify `processes.txt` exists in the repository root
- Check that process IDs are not commented out (lines starting with `#`)
- Ensure each process ID is on a separate line
- Empty lines are skipped automatically

### Process check fails
- The workflow continues even if individual processes fail
- Check the detailed logs in the workflow run for specific error messages
- Verify:
  - Process ID is correct and active
  - Wallet has access to the process
  - CU_URL is correct and accessible
  - WALLET_JSON secret is valid

### "No processes in processes.txt" message
- The `processes.txt` file exists but is empty or only contains comments
- Add at least one valid process ID to the file

### High token usage
- Reduce the schedule frequency (change cron expression)
- Reduce the concurrency setting in Variables
- Remove unused processes from `processes.txt`

## Advanced Configuration

### Adding More Processes
Simply add new process IDs to `processes.txt`, one per line:
```
xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs
qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
yAbC123DEfGhI456JkLmN789OpQrStUvWxYz
newProcessId123456789AbCdEfGhIjKlMnOpQrSt
```

No workflow changes needed.

### Removing Processes
Delete or comment out the line in `processes.txt`:
```
# xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs  <- This will be skipped
qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE  <- This will be checked
```

### Custom Hyperbeam Endpoint
Add this secret if your processes use a specific Hyperbeam instance:
```
Secret Name: HYPERBEAM_BASE_URL
Value: https://state-1.forward.computer
```

The workflow will automatically use it if set.

### Custom Output Format
To change output format to CSV, edit `.github/workflows/check-balances.yml` and modify the `Check process balances` step:
```bash
--output csv \
--file "balance-report-${safe_name}.csv" \
```

### Environment Variables
The workflow sets these environment variables for each run:
- `CU_URL`: From `secrets.CU_URL` (required)
- `WALLET_PATH`: Set to `wallet.json` (temporary, cleaned up after run)
- `HYPERBEAM_BASE_URL`: From `secrets.HYPERBEAM_BASE_URL` or default
- `CONCURRENCY`: From `vars.CONCURRENCY` or default (15)
- `RETRY_ATTEMPTS`: From `vars.RETRY_ATTEMPTS` or default (3)

## Example: Adding Email Notifications

To send email notifications when checks fail, add this step to the workflow:

```yaml
- name: Send notification on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      // Send email or Slack notification
      // Implement your notification logic here
```

## Cost Implications

GitHub Actions provides:
- **Free tier**: 2,000 minutes/month for private repos, unlimited for public
- **Each 30-min run**: ~1-3 minutes of execution time
- **Monthly runs**: ~48 runs × 2 minutes ≈ 96 minutes/month

This is well within free tier limits for most users.

## Security Best Practices

1. ✅ Wallet JSON is stored as a **Secret** (encrypted, only visible in logs if explicitly printed)
2. ✅ Wallet file is created temporarily and deleted after each run
3. ✅ Use a wallet with limited permissions (if possible)
4. ✅ Rotate wallet periodically for long-running systems
5. ✅ Restrict who can trigger manual runs: **Settings → Actions → General → Access**

## Next Steps

1. Configure all required secrets
2. Customize the workflow for your processes
3. Run a manual test
4. Monitor the first few automated runs
5. Adjust schedule/concurrency based on results

For more information about the balance-checker tool, see [README.md](README.md).
