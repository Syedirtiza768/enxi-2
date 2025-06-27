#!/bin/bash

# Create a new sales order via API
curl -X POST http://localhost:3000/api/sales-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cm4wkzxkn0008qcz4kh1hq5w8",
    "items": [
      {
        "itemCode": "DIESEL-001",
        "description": "Premium Diesel Fuel",
        "quantity": 1000,
        "unitPrice": 3.50,
        "discount": 2,
        "taxRate": 5
      },
      {
        "itemCode": "MARINE-GAS-001", 
        "description": "Marine Gasoline",
        "quantity": 500,
        "unitPrice": 4.20,
        "discount": 0,
        "taxRate": 5
      }
    ],
    "requestedDate": "2025-01-20T00:00:00Z",
    "promisedDate": "2025-01-22T00:00:00Z",
    "paymentTerms": "Net 30",
    "shippingTerms": "FOB Destination",
    "shippingAddress": "123 Harbor Drive\nMarina Bay\nDubai, UAE",
    "billingAddress": "456 Business Center\nDowntown\nDubai, UAE",
    "customerPO": "PO-2025-001",
    "notes": "Please deliver to Dock B. Contact site manager upon arrival."
  }' | python3 -m json.tool