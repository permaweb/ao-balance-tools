import { dryrun } from '@permaweb/aoconnect';

async function test() {
  // Try with a well-known process
  const testProcess = 'xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs'; // From the README
  try {
    console.log('Testing dryrun for', testProcess);
    const result = await dryrun({
      process: testProcess,
      data: '',
      tags: [{ name: 'Action', value: 'Balances' }],
    });
    console.log('Success! Messages:', result.Messages?.length);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

test();
