import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing with DM3FoZUq process...');
    const result = await dryrun({
      process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
      data: '',
      tags: [{ name: 'Action', value: 'Balances' }],
    });
    console.log('Full result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
