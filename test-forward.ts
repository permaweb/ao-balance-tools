import { dryrun } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing dryrun against cu.ao-testnet.xyz...');
    const result = await dryrun({
      process: 'DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo',
      data: '',
      tags: [{ name: 'Action', value: 'Balances' }],
    });
    console.log('Got result with', result.Messages?.length, 'messages');
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
