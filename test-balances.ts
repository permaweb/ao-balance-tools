import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing Balances action...');
    const result = await Promise.race([
      dryrun({
        process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
        data: '',
        tags: [{ name: 'Action', value: 'Balances' }],
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 20s')), 20000)
      )
    ]);
    
    console.log('Result:', JSON.stringify(result, null, 2).substring(0, 500));
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
