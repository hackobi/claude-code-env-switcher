#!/usr/bin/env python3
"""
Demos Faucet Automation - Python Version
Simple Python script for automated wallet creation and faucet requests
"""

import json
import time
import random
import string
import hashlib
import secrets
import argparse
import requests
from datetime import datetime
from typing import Dict, List, Optional

class DemosFaucetAutomation:
    def __init__(self):
        self.faucet_frontend_url = "https://faucet.demos.sh"
        self.faucet_backend_url = "https://faucetbackend.demos.sh"
        
    def generate_wallet(self) -> Dict[str, str]:
        """Generate a simple wallet address for demo purposes"""
        # Generate random bytes for address
        random_bytes = secrets.token_bytes(32)
        # Create a hex address (simplified - not actual Demos wallet generation)
        address = "0x" + hashlib.sha256(random_bytes).hexdigest()
        
        # Generate a simple mnemonic (for demo purposes only)
        words = ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
                 "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
                 "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual"]
        mnemonic = " ".join(random.sample(words, 12))
        
        return {
            "address": address,
            "mnemonic": mnemonic,
            "created_at": datetime.now().isoformat()
        }
    
    def request_tokens(self, address: str, retry_count: int = 3) -> bool:
        """Request tokens from the faucet"""
        print(f"💰 Requesting tokens for address: {address}")
        
        for attempt in range(1, retry_count + 1):
            print(f"🔄 Attempt {attempt}/{retry_count}...")
            
            try:
                # Prepare the request
                payload = {
                    "publicKey": address,
                    "amount": 10  # Default amount
                }
                
                # Make the request
                response = requests.post(
                    f"{self.faucet_backend_url}/api/claim",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Tokens requested successfully!")
                    return True
                elif response.status_code == 429:
                    print("⚠️  Rate limited. Please wait before trying again.")
                    if attempt < retry_count:
                        wait_time = 30 * attempt
                        print(f"⏳ Waiting {wait_time} seconds...")
                        time.sleep(wait_time)
                else:
                    print(f"❌ Request failed: {response.text}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Network error: {str(e)}")
                
            if attempt < retry_count:
                time.sleep(5)
                
        return False
    
    def check_faucet_status(self) -> Optional[Dict]:
        """Check the faucet status"""
        try:
            response = requests.get(f"{self.faucet_backend_url}/api/balance", timeout=10)
            if response.status_code == 200:
                data = response.json()
                balance = data.get("body", {}).get("balance", "Unknown")
                address = data.get("body", {}).get("publicKey", "Unknown")
                
                print("✅ Faucet Status:")
                print(f"   Balance: {balance} DEM")
                print(f"   Address: {address}")
                
                return {"balance": balance, "address": address}
        except Exception as e:
            print(f"❌ Failed to check faucet status: {str(e)}")
        
        return None
    
    def save_wallet(self, wallet: Dict, filename: Optional[str] = None):
        """Save wallet to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"wallet_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(wallet, f, indent=2)
        
        print(f"💾 Wallet saved to {filename}")
        
    def run_automation(self, count: int = 1, delay: int = 5000):
        """Run full automation workflow"""
        print(f"🤖 Starting automated workflow for {count} wallet(s)\n")
        
        wallets = []
        
        # Step 1: Create wallets
        print("📝 Step 1: Creating wallets...")
        for i in range(1, count + 1):
            print(f"\n🔑 Creating wallet {i}/{count}...")
            wallet = self.generate_wallet()
            wallets.append(wallet)
            
            # Save wallet
            self.save_wallet(wallet, f"demos_wallet_{i}.json")
            
            print(f"✅ Wallet {i} created:")
            print(f"   Address: {wallet['address'][:20]}...{wallet['address'][-10:]}")
            
            if i < count:
                time.sleep(2)
        
        # Step 2: Request tokens
        print("\n💰 Step 2: Requesting tokens from faucet...")
        successful_requests = 0
        
        for i, wallet in enumerate(wallets, 1):
            print(f"\n📤 Requesting tokens for wallet {i}/{count}...")
            
            if self.request_tokens(wallet['address']):
                successful_requests += 1
            
            if i < count:
                print(f"⏳ Waiting {delay/1000} seconds before next request...")
                time.sleep(delay / 1000)
        
        # Summary
        print("\n" + "="*50)
        print("📊 AUTOMATION COMPLETE")
        print(f"✅ Wallets created: {count}")
        print(f"💰 Successful faucet requests: {successful_requests}/{count}")
        print(f"💾 Wallet files saved: demos_wallet_1.json to demos_wallet_{count}.json")
        print("="*50)

def main():
    parser = argparse.ArgumentParser(description='Demos Faucet Automation Tool')
    parser.add_argument('command', choices=['create', 'request', 'status', 'auto'],
                        help='Command to execute')
    parser.add_argument('--address', help='Wallet address for faucet request')
    parser.add_argument('--count', type=int, default=1, help='Number of wallets to create')
    parser.add_argument('--delay', type=int, default=5000, help='Delay between requests (ms)')
    parser.add_argument('--save', action='store_true', help='Save wallet to file')
    
    args = parser.parse_args()
    
    automation = DemosFaucetAutomation()
    
    if args.command == 'create':
        wallet = automation.generate_wallet()
        print("🔑 New wallet created:")
        print(f"   Address: {wallet['address']}")
        print(f"   Mnemonic: {wallet['mnemonic']}")
        
        if args.save:
            automation.save_wallet(wallet)
            
    elif args.command == 'request':
        if not args.address:
            print("❌ Error: --address required for faucet request")
            return
        
        automation.request_tokens(args.address)
        
    elif args.command == 'status':
        automation.check_faucet_status()
        
    elif args.command == 'auto':
        automation.run_automation(count=args.count, delay=args.delay)

if __name__ == "__main__":
    print("🎯 Demos Faucet Automation Tool (Python Version)")
    print("=" * 50)
    main()