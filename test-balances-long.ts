import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing Balances action with 60s timeout...');
    const start = Date.now();
    const result = await Promise.race([
      dryrun({
        process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
        data: '',
        tags: [{ name: 'Action', value: 'Balances' }],
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 60000)
      )
    ]);
    
    const elapsed = Date.now() - start;
    console.log(`✓ Success after ${elapsed}ms`);
    if (result.Messages && result.Messages[0]) {
      const dataLen = result.Messages[0].Data?.length || 0;
      console.log(`Response size: ${dataLen} bytes`);
      if (dataLen > 0) {
        console.log(`First 200 chars: ${result.Messages[0].Data?.substring(0, 200)}`);
      }
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`✗ Error after ${elapsed}ms:`, err instanceof Error ? err.message : err);
  }
}

const start = Date.now();
test();
