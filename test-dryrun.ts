import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing dryrun for DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo...');
    const result = await dryrun({
      process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
      data: '',
      tags: [{ name: 'Action', value: 'Balances' }],
    });
    console.log('Success! Messages:', result.Messages?.length);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
