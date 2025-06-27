#!/bin/bash

# Create a new sales order via API
curl -X POST http://localhost:3000/api/sales-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cmcc5cnok001rv2x9z7tof9hs",
    "items": [
      {
        "itemCode": "PROD-001",
        "description": "Standard Product",
        "quantity": 25,
        "unitPrice": 150.00,
        "discount": 5,
        "taxRate": 10
      },
      {
        "itemCode": "SERV-001",
        "description": "Installation Service",
        "quantity": 1,
        "unitPrice": 500.00,
        "discount": 0,
        "taxRate": 10
      }
    ],
    "customerPO": "PO-2025-123",
    "paymentTerms": "Net 30",
    "shippingTerms": "FOB Destination",
    "shippingAddress": "123 Main Street\nDubai, UAE",
    "billingAddress": "456 Business Center\nDubai, UAE",
    "notes": "Please call before delivery"
  }' | python3 -m json.tool