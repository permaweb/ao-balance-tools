import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing Info action...');
    const result = await Promise.race([
      dryrun({
        process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
        data: '',
        tags: [{ name: 'Action', value: 'Info' }],
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      )
    ]);
    
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
