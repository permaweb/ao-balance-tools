import { connect } from '@permaweb/aoconnect';
import { Config, AOBalanceResponse } from './types';

export class AOClient {
  private cuUrl: string;

  constructor(config: Config) {
    this.cuUrl = config.cuUrl;
  }

  async getBalances(processId: string): Promise<AOBalanceResponse> {
    try {
      const { dryrun } = connect({ CU_URL: this.cuUrl });
      
      const result = await dryrun({
        process: processId,
        data: '',
        tags: [
          { name: 'Action', value: 'Balances' }
        ],
      });

      if (!result || !result.Messages || result.Messages.length === 0) {
        throw new Error('No response from AO process');
      }

      const message = result.Messages[0];
      
      if (!message.Data) {
        throw new Error('No data in AO process response');
      }

      let balanceData: AOBalanceResponse;
      
      try {
        balanceData = JSON.parse(message.Data);
      } catch (parseError) {
        throw new Error(`Failed to parse AO balance data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (typeof balanceData !== 'object' || balanceData === null) {
        throw new Error('Invalid balance data format from AO process');
      }

      return balanceData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch balances from AO process: ${error.message}`);
      }
      throw new Error('Failed to fetch balances from AO process: Unknown error');
    }
  }

  async validateProcessId(processId: string): Promise<boolean> {
    if (!processId || processId.trim().length === 0) {
      return false;
    }

    if (processId.length !== 43) {
      return false;
    }

    const validChars = /^[a-zA-Z0-9_-]+$/;
    return validChars.test(processId);
  }
}
