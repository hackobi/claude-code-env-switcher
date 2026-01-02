import { gcr } from '../shared-lib/gcr-client';
import { demosClient } from '../shared-lib/demos-client';
import type { DAHRAttestation, GCRDelta } from '../shared-lib/types';
import type { AttestationProof, FetchResult } from './types';

export class AttestationEngine {
  private oracleAddress: string | null = null;

  async initialize(): Promise<void> {
    await demosClient.ensureLoaded();
    this.oracleAddress = demosClient.address || 'oracle_' + Date.now();
    console.log(`🔐 Attestation Engine initialized: ${this.oracleAddress}`);
  }

  async createAttestation(
    marketId: string,
    fetchResult: FetchResult
  ): Promise<AttestationProof | null> {
    if (!fetchResult.success || fetchResult.value === undefined) {
      console.error('❌ Cannot create attestation from failed fetch');
      return null;
    }

    if (!this.oracleAddress) {
      await this.initialize();
    }

    const proofHash = fetchResult.attestation?.proofHash || 
      gcr.generateId('proof', marketId, Date.now().toString());

    const tlsSessionId = this.extractTLSSessionId(fetchResult.rawResponse);

    const signature = await this.signAttestation(
      marketId,
      fetchResult.value,
      proofHash
    );

    const proof: AttestationProof = {
      marketId,
      fetchedValue: fetchResult.value,
      proofHash,
      tlsSessionId,
      timestamp: Date.now(),
      oracleAddress: this.oracleAddress!,
      signature
    };

    console.log(`📝 Attestation created for market ${marketId.slice(0, 8)}...`);
    console.log(`   Value: ${fetchResult.value}`);
    console.log(`   Proof: ${proofHash.slice(0, 16)}...`);

    return proof;
  }

  async submitToGCR(proof: AttestationProof): Promise<string> {
    const attestation: DAHRAttestation = {
      id: gcr.generateId(proof.marketId, proof.proofHash),
      marketId: proof.marketId,
      fetchedAt: proof.timestamp,
      rawValue: proof.fetchedValue,
      proofHash: proof.proofHash,
      oracleSignature: proof.signature,
      status: 'Verified'
    };

    const delta: GCRDelta<DAHRAttestation> = {
      operation: 'CREATE',
      entity: 'DAHRAttestation',
      id: attestation.id,
      data: attestation,
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);

    console.log(`✅ Attestation submitted to GCR: ${attestation.id.slice(0, 16)}...`);

    return attestation.id;
  }

  async verifyAttestation(attestationId: string): Promise<boolean> {
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);
    
    if (!attestation) {
      console.warn(`⚠️ Attestation not found: ${attestationId}`);
      return false;
    }

    const isValid = attestation.status === 'Verified' || attestation.status === 'Finalized';
    
    console.log(`🔍 Attestation ${attestationId.slice(0, 8)}... status: ${attestation.status} (valid: ${isValid})`);
    
    return isValid;
  }

  private extractTLSSessionId(rawResponse: any): string {
    if (rawResponse?.extra?.tlsSessionId) {
      return rawResponse.extra.tlsSessionId;
    }
    if (rawResponse?.extra?.transactionHash) {
      return rawResponse.extra.transactionHash;
    }
    return `tls_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async signAttestation(
    marketId: string,
    value: bigint,
    proofHash: string
  ): Promise<string> {
    const message = `${marketId}:${value.toString()}:${proofHash}`;
    const hash = gcr.generateId(message, this.oracleAddress || '', Date.now().toString());
    return `sig_${hash.slice(0, 32)}`;
  }

  async challengeAttestation(attestationId: string, reason: string): Promise<boolean> {
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);
    
    if (!attestation) {
      return false;
    }

    const delta: GCRDelta<DAHRAttestation> = {
      operation: 'UPDATE',
      entity: 'DAHRAttestation',
      id: attestationId,
      data: { status: 'Challenged' },
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);
    
    console.log(`⚠️ Attestation challenged: ${attestationId.slice(0, 8)}... Reason: ${reason}`);
    
    return true;
  }

  async finalizeAttestation(attestationId: string): Promise<boolean> {
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);
    
    if (!attestation || attestation.status === 'Challenged') {
      return false;
    }

    const delta: GCRDelta<DAHRAttestation> = {
      operation: 'UPDATE',
      entity: 'DAHRAttestation',
      id: attestationId,
      data: { status: 'Finalized' },
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);
    
    console.log(`✅ Attestation finalized: ${attestationId.slice(0, 8)}...`);
    
    return true;
  }
}

export const attestationEngine = new AttestationEngine();
