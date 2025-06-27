#!/bin/bash

# Create a new sales order via API with minimal required fields
curl -X POST http://localhost:3000/api/sales-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cmccdyi3b0003v26v53xhsxav",
    "items": [
      {
        "itemCode": "ITEM-001",
        "description": "Standard Product Item",
        "quantity": 10,
        "unitPrice": 100.00
      }
    ]
  }' | python3 -m json.tool