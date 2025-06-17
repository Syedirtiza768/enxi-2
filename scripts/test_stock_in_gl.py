#!/usr/bin/env python3
"""
Test script for Stock-In functionality with GL integration
Tests the complete flow from stock movement to journal entry creation
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, List

# Configuration
API_BASE = "http://localhost:3001/api"
HEADERS = {"Content-Type": "application/json"}

# Test items
TEST_ITEMS = [
    {
        "itemCode": "LAPTOP-001",
        "quantity": 5,
        "unitCost": 1500.00,
        "location": "WAREHOUSE-A",
        "reference": f"TEST-LAPTOP-{int(time.time())}",
        "notes": "Test laptop stock-in with GL integration"
    },
    {
        "itemCode": "PAPER-A4",
        "quantity": 100,
        "unitCost": 5.00,
        "location": "WAREHOUSE-A",
        "reference": f"TEST-PAPER-{int(time.time())}",
        "notes": "Test paper stock-in with GL integration"
    }
]


def api_call(endpoint: str, method: str = "GET", data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make API call and return response data"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS)
        elif method == "POST":
            response = requests.post(url, headers=HEADERS, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        raise


def test_stock_in(item_config: Dict[str, Any]) -> Dict[str, Any]:
    """Test a single stock-in transaction"""
    print(f"\n🧪 Testing Stock-In for {item_config['itemCode']}")
    print("─" * 50)
    
    result = {"success": False, "item": item_config['itemCode']}
    
    try:
        # Step 1: Check initial balance
        print("📊 Checking initial inventory balance...")
        balance_response = api_call(
            f"/inventory/balances?itemCode={item_config['itemCode']}&location={item_config['location']}"
        )
        initial_balance = balance_response.get("data", [{}])[0].get("quantity", 0)
        print(f"  Initial balance: {initial_balance}")
        
        # Step 2: Create stock-in movement
        print("\n📥 Creating stock-in transaction...")
        movement_data = {
            "type": "IN",
            "itemCode": item_config["itemCode"],
            "quantity": item_config["quantity"],
            "unitCost": item_config["unitCost"],
            "location": item_config["location"],
            "reference": item_config["reference"],
            "notes": item_config["notes"]
        }
        
        movement_response = api_call("/stock-movements", "POST", movement_data)
        movement_id = movement_response["data"]["id"]
        total_value = item_config["quantity"] * item_config["unitCost"]
        
        print(f"  ✅ Movement created: ID {movement_id}")
        print(f"  Total value: ${total_value:,.2f}")
        result["movement_id"] = movement_id
        
        # Step 3: Verify inventory update
        print("\n📈 Verifying inventory balance update...")
        time.sleep(1)  # Wait for processing
        
        new_balance_response = api_call(
            f"/inventory/balances?itemCode={item_config['itemCode']}&location={item_config['location']}"
        )
        new_balance = new_balance_response.get("data", [{}])[0].get("quantity", 0)
        expected_balance = initial_balance + item_config["quantity"]
        
        print(f"  New balance: {new_balance}")
        print(f"  Expected: {expected_balance}")
        
        if new_balance == expected_balance:
            print("  ✅ Balance updated correctly")
        else:
            print("  ❌ Balance mismatch!")
            
        # Step 4: Check journal entry
        print("\n📚 Checking journal entry creation...")
        journal_response = api_call(f"/journal-entries?reference=STOCK-IN-{movement_id}")
        
        if journal_response.get("data"):
            entry = journal_response["data"][0]
            print(f"  ✅ Journal entry found: ID {entry['id']}")
            print(f"  Date: {entry['date']}")
            print(f"  Description: {entry['description']}")
            
            # Analyze journal lines
            print("\n  Journal Lines:")
            total_debits = 0
            total_credits = 0
            
            for line in entry["lines"]:
                account_name = line.get("account", {}).get("name", line["accountCode"])
                amount = float(line["amount"])
                print(f"    {line['type']}: {account_name} - ${amount:,.2f}")
                
                if line["type"] == "DEBIT":
                    total_debits += amount
                else:
                    total_credits += amount
                
                # Verify amount matches expected
                if abs(amount - total_value) > 0.01:
                    print(f"    ⚠️  Amount mismatch! Expected: ${total_value:,.2f}")
            
            # Verify balanced entry
            print(f"\n  Total Debits: ${total_debits:,.2f}")
            print(f"  Total Credits: ${total_credits:,.2f}")
            
            if abs(total_debits - total_credits) < 0.01:
                print("  ✅ Entry is balanced")
                result["success"] = True
            else:
                print("  ❌ Entry is not balanced!")
        else:
            print("  ❌ No journal entry found!")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        result["error"] = str(e)
    
    return result


def test_gl_balances():
    """Test GL account balances"""
    print("\n💰 Checking GL Account Balances")
    print("─" * 50)
    
    try:
        # Check inventory account (1300)
        print("Inventory Account (1300):")
        inv_response = api_call("/accounts/1300/balance")
        print(f"  Balance: ${inv_response.get('balance', 0):,.2f}")
        
        # Check accounts payable (2100)
        print("\nAccounts Payable (2100):")
        ap_response = api_call("/accounts/2100/balance")
        print(f"  Balance: ${ap_response.get('balance', 0):,.2f}")
        
    except Exception as e:
        print(f"  Error checking balances: {e}")


def run_tests():
    """Main test runner"""
    print("🚀 Starting Stock-In GL Integration Tests")
    print("═" * 50)
    print(f"Server: {API_BASE}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Test each item
    for item_config in TEST_ITEMS:
        result = test_stock_in(item_config)
        results.append(result)
    
    # Check GL balances
    test_gl_balances()
    
    # Summary
    print("\n📊 Test Summary")
    print("═" * 50)
    
    successful = sum(1 for r in results if r.get("success"))
    failed = len(results) - successful
    
    print(f"Total tests: {len(results)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    
    if failed > 0:
        print("\nFailed tests:")
        for r in results:
            if not r.get("success"):
                print(f"  - {r['item']}: {r.get('error', 'Unknown error')}")
    
    print("\n✨ Test run complete!")


if __name__ == "__main__":
    run_tests()