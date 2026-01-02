let demos: any = null;
let demosLoaded = false;

async function loadDemos(): Promise<any> {
  if (demosLoaded) return demos;
  
  try {
    const sdk = await import('@kynesyslabs/demosdk/websdk');
    demos = sdk.demos;
    demosLoaded = true;
    console.log('✅ Demos SDK loaded');
  } catch (e) {
    console.warn('⚠️ Could not load Demos SDK - using mock mode');
    demos = createMockDemos();
    demosLoaded = true;
  }
  return demos;
}

function createMockDemos() {
  return {
    connect: async () => console.log('[Mock] demos.connect()'),
    connectWallet: async () => console.log('[Mock] demos.connectWallet()'),
    getAddress: () => '0xMockAddress_' + Math.random().toString(36).slice(2, 10),
    getBalance: async () => '1000000000000000000',
    getLastBlockNumber: async () => Math.floor(Date.now() / 1000),
    getTransactionHistory: async () => [],
    confirm: async (tx: any) => tx,
    broadcast: async () => ({ hash: 'mock_tx_' + Date.now() }),
    web2: {
      createDahr: async () => ({
        startProxy: async (params: any) => ({
          result: 0,
          response: { 
            status: 200, 
            statusText: 'OK',
            headers: {},
            data: JSON.stringify([{ id: 1, value: Math.floor(Math.random() * 20) + 1 }])
          },
          require_reply: false,
          extra: { transactionHash: 'mock_dahr_' + Date.now() }
        })
      })
    }
  };
}

export interface DemosConfig {
  rpcUrl: string;
  mnemonic?: string;
}

export interface ConnectionState {
  connected: boolean;
  address: string | null;
  error: string | null;
}

class DemosClient {
  private _connected = false;
  private _address: string | null = null;
  private _rpcUrl: string = 'https://node2.demos.sh';
  private _demos: any = null;

  async ensureLoaded(): Promise<any> {
    if (!this._demos) {
      this._demos = await loadDemos();
    }
    return this._demos;
  }

  get instance() {
    return this._demos;
  }

  get connected(): boolean {
    return this._connected;
  }

  get address(): string | null {
    return this._address;
  }

  async connect(config: DemosConfig): Promise<ConnectionState> {
    try {
      console.log(`🔗 Connecting to Demos Network: ${config.rpcUrl}`);
      this._rpcUrl = config.rpcUrl;
      
      const d = await this.ensureLoaded();
      await d.connect(config.rpcUrl);
      
      if (config.mnemonic) {
        await d.connectWallet(config.mnemonic);
        this._address = d.getAddress();
        console.log(`✅ Wallet connected: ${this._address}`);
      }
      
      this._connected = true;
      
      return {
        connected: true,
        address: this._address,
        error: null
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      console.error(`❌ Demos connection failed: ${message}`);
      
      return {
        connected: false,
        address: null,
        error: message
      };
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._address = null;
    console.log('🔌 Disconnected from Demos Network');
  }

  async getBalance(address?: string): Promise<bigint> {
    const d = await this.ensureLoaded();
    const target = address || this._address;
    if (!target) throw new Error('No address available');
    
    const balance = await d.getBalance(target);
    return BigInt(balance);
  }

  async getLastBlockNumber(): Promise<number> {
    const d = await this.ensureLoaded();
    return await d.getLastBlockNumber();
  }

  async getTransactionHistory(
    address: string,
    type?: string,
    options?: { limit?: number }
  ): Promise<any[]> {
    const d = await this.ensureLoaded();
    return await d.getTransactionHistory(address, type, options);
  }

  async confirm(tx: any): Promise<any> {
    const d = await this.ensureLoaded();
    return await d.confirm(tx);
  }

  async broadcast(validityData: any): Promise<any> {
    const d = await this.ensureLoaded();
    return await d.broadcast(validityData);
  }

  async getDahr(): Promise<any> {
    const d = await this.ensureLoaded();
    return await d.web2.createDahr();
  }
}

export const demosClient = new DemosClient();

export async function getDemos(): Promise<any> {
  return await loadDemos();
}
