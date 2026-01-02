import type { FHEEncryptedValue } from './types';

class FHEManager {
  private encryptedValues: Map<string, { value: bigint; context: string }> = new Map();
  private decryptionAllowed: Set<string> = new Set();
  private pendingDecryptions: Map<string, Promise<bigint>> = new Map();

  encrypt(value: bigint, context: string): FHEEncryptedValue {
    const ciphertext = `fhe_${context}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    this.encryptedValues.set(ciphertext, { value, context });
    
    console.log(`🔐 FHE Encrypted: ${value} → ${ciphertext.slice(0, 20)}...`);
    
    return {
      ciphertext,
      context,
      canDecrypt: false
    };
  }

  authorizeDecryption(ciphertext: string): void {
    if (!this.encryptedValues.has(ciphertext)) {
      console.warn(`⚠️ Unknown ciphertext: ${ciphertext.slice(0, 20)}...`);
      return;
    }
    
    this.decryptionAllowed.add(ciphertext);
    console.log(`🔓 Decryption authorized: ${ciphertext.slice(0, 20)}...`);
  }

  authorizeMarketDecryption(marketId: string): number {
    let count = 0;
    
    for (const [ciphertext, { context }] of this.encryptedValues) {
      if (context.includes(marketId)) {
        this.decryptionAllowed.add(ciphertext);
        count++;
      }
    }
    
    console.log(`🔓 Authorized ${count} decryptions for market ${marketId.slice(0, 8)}...`);
    return count;
  }

  async decrypt(ciphertext: string): Promise<bigint> {
    if (!this.decryptionAllowed.has(ciphertext)) {
      throw new Error('Decryption not authorized - resolution epoch not reached');
    }

    const entry = this.encryptedValues.get(ciphertext);
    if (!entry) {
      throw new Error('Invalid ciphertext');
    }

    if (this.pendingDecryptions.has(ciphertext)) {
      return this.pendingDecryptions.get(ciphertext)!;
    }

    const decryptionPromise = new Promise<bigint>((resolve) => {
      setTimeout(() => {
        console.log(`🔓 FHE Decrypted: ${ciphertext.slice(0, 20)}... → ${entry.value}`);
        resolve(entry.value);
      }, 100);
    });

    this.pendingDecryptions.set(ciphertext, decryptionPromise);
    return decryptionPromise;
  }

  async decryptBatch(ciphertexts: string[]): Promise<Map<string, bigint>> {
    const results = new Map<string, bigint>();
    
    console.log(`🔓 Batch decrypting ${ciphertexts.length} values...`);
    
    const promises = ciphertexts.map(async (ct) => {
      try {
        const value = await this.decrypt(ct);
        results.set(ct, value);
      } catch (error) {
        console.warn(`⚠️ Failed to decrypt ${ct.slice(0, 20)}...`);
      }
    });

    await Promise.all(promises);
    
    console.log(`✅ Decrypted ${results.size}/${ciphertexts.length} values`);
    
    return results;
  }

  homomorphicAdd(ct1: string, ct2: string, outputContext: string): FHEEncryptedValue {
    const v1 = this.encryptedValues.get(ct1)?.value ?? 0n;
    const v2 = this.encryptedValues.get(ct2)?.value ?? 0n;
    
    return this.encrypt(v1 + v2, outputContext);
  }

  homomorphicSubtract(ct1: string, ct2: string, outputContext: string): FHEEncryptedValue {
    const v1 = this.encryptedValues.get(ct1)?.value ?? 0n;
    const v2 = this.encryptedValues.get(ct2)?.value ?? 0n;
    
    return this.encrypt(v1 - v2, outputContext);
  }

  getEncryptedValueInfo(ciphertext: string): { context: string; canDecrypt: boolean } | null {
    const entry = this.encryptedValues.get(ciphertext);
    if (!entry) return null;
    
    return {
      context: entry.context,
      canDecrypt: this.decryptionAllowed.has(ciphertext)
    };
  }

  clearMarketData(marketId: string): void {
    for (const [ciphertext, { context }] of this.encryptedValues) {
      if (context.includes(marketId)) {
        this.encryptedValues.delete(ciphertext);
        this.decryptionAllowed.delete(ciphertext);
        this.pendingDecryptions.delete(ciphertext);
      }
    }
    console.log(`🧹 Cleared FHE data for market ${marketId.slice(0, 8)}...`);
  }
}

export const fheManager = new FHEManager();
export { FHEManager };
