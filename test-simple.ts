import { connect } from '@permaweb/aoconnect';

async function test() {
  try {
    console.log('Testing connect with CU_URL: https://cu.ao-testnet.xyz');
    const { dryrun } = connect({ CU_URL: 'https://cu.ao-testnet.xyz' });
    
    console.log('Calling dryrun with timeout...');
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
    
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
