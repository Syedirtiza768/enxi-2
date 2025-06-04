# Inventory API Documentation

## Overview
The Inventory API provides endpoints for managing categories, items, stock movements, and inventory reports in the ERP system.

## Authentication
All endpoints require authentication via session token. Include the session cookie in your requests.

## Categories API

### List Categories
```
GET /api/inventory/categories
```

Query Parameters:
- `parentId` (string, optional): Filter by parent category ID. Use 'null' for root categories
- `isActive` (boolean, optional): Filter by active status
- `search` (string, optional): Search by code, name, or description
- `includeChildren` (boolean, optional): Include child categories in response
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

### Get Category Tree
```
GET /api/inventory/categories/tree
```
Returns hierarchical tree of active categories.

### Get Single Category
```
GET /api/inventory/categories/{id}
```

### Create Category
```
POST /api/inventory/categories
```

Request Body:
```json
{
  "code": "ELECTRONICS",
  "name": "Electronics",
  "description": "Electronic products",
  "parentId": "parent-category-id" // optional
}
```

### Update Category
```
PUT /api/inventory/categories/{id}
```

Request Body (all fields optional):
```json
{
  "code": "NEW-CODE",
  "name": "New Name",
  "description": "New description",
  "parentId": "new-parent-id",
  "isActive": true
}
```

### Delete Category
```
DELETE /api/inventory/categories/{id}
```

## Items API

### List Items
```
GET /api/inventory/items
```

Query Parameters:
- `categoryId` (string, optional): Filter by category
- `type` (string, optional): Filter by type (PRODUCT, SERVICE, RAW_MATERIAL, etc.)
- `isActive` (boolean, optional): Filter by active status
- `isSaleable` (boolean, optional): Filter saleable items
- `isPurchaseable` (boolean, optional): Filter purchaseable items
- `trackInventory` (boolean, optional): Filter items that track inventory
- `search` (string, optional): Search by code, name, or description
- `belowMinStock` (boolean, optional): Filter items below minimum stock
- `belowReorderPoint` (boolean, optional): Filter items below reorder point
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

### Get Single Item
```
GET /api/inventory/items/{id}
```

### Create Item
```
POST /api/inventory/items
```

Request Body:
```json
{
  "code": "PHONE-001",
  "name": "Smartphone",
  "description": "Latest model smartphone",
  "categoryId": "category-id",
  "type": "PRODUCT",
  "unitOfMeasureId": "uom-id",
  "trackInventory": true,
  "minStockLevel": 10,
  "maxStockLevel": 1000,
  "reorderPoint": 20,
  "standardCost": 500,
  "listPrice": 800,
  "inventoryAccountId": "account-id", // optional
  "cogsAccountId": "account-id",      // optional
  "salesAccountId": "account-id",     // optional
  "isSaleable": true,
  "isPurchaseable": true
}
```

### Update Item
```
PUT /api/inventory/items/{id}
```

Request Body (all fields optional).

### Delete Item
```
DELETE /api/inventory/items/{id}
```

## Stock Movements API

### List Stock Movements
```
GET /api/inventory/stock-movements
```

Query Parameters:
- `itemId` (string, required): Item ID to get movements for
- `movementType` (string, optional): Filter by type (STOCK_IN, STOCK_OUT, ADJUSTMENT, etc.)
- `dateFrom` (string, optional): Start date (ISO format)
- `dateTo` (string, optional): End date (ISO format)
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

### Create Stock Movement
```
POST /api/inventory/stock-movements
```

Request Body:
```json
{
  "itemId": "item-id",
  "movementType": "STOCK_IN",
  "movementDate": "2024-01-15T10:00:00Z",
  "quantity": 100,
  "unitCost": 450,
  "unitOfMeasureId": "uom-id",         // optional
  "referenceType": "PURCHASE",         // optional
  "referenceId": "reference-id",       // optional
  "referenceNumber": "PO-001",         // optional
  "locationId": "location-id",         // optional
  "location": "Warehouse A",           // optional
  "notes": "Initial stock purchase",   // optional
  "autoCreateLot": true,               // optional, default true
  "lotNumber": "LOT-001",              // optional
  "expiryDate": "2025-01-15",          // optional
  "supplier": "Supplier Name",         // optional
  "purchaseRef": "SUP-REF-001"         // optional
}
```

### Create Stock Adjustment
```
POST /api/inventory/stock-movements/adjust
```

Request Body:
```json
{
  "itemId": "item-id",
  "adjustmentQuantity": -10,  // negative for decrease, positive for increase
  "reason": "Damaged during handling",
  "unitCost": 450             // optional
}
```

### Create Opening Stock
```
POST /api/inventory/stock-movements/opening
```

Request Body:
```json
{
  "itemId": "item-id",
  "quantity": 50,
  "unitCost": 400,
  "asOfDate": "2024-01-01",   // optional, defaults to today
  "lotNumber": "OPEN-001"     // optional
}
```

## Stock Lots API

### List Stock Lots
```
GET /api/inventory/stock-lots
```

Query Parameters:
- `itemId` (string, required): Item ID
- `isActive` (boolean, optional): Filter by active status
- `hasStock` (boolean, optional): Filter lots with available stock
- `expiryDateBefore` (string, optional): Filter by expiry date
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

## Units of Measure API

### List Units of Measure
```
GET /api/inventory/units-of-measure
```

Query Parameters:
- `isActive` (boolean, optional): Filter by active status
- `search` (string, optional): Search by code or name
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

### Create Unit of Measure
```
POST /api/inventory/units-of-measure
```

Request Body:
```json
{
  "code": "KG",
  "name": "Kilogram",
  "symbol": "kg",
  "isBaseUnit": true,
  "baseUnitId": null,         // required if not base unit
  "conversionFactor": null    // required if not base unit
}
```

## Reports API

### Stock Summary Report
```
GET /api/inventory/reports/stock-summary
```

Query Parameters:
- `categoryId` (string, optional): Filter by category
- `belowMinStock` (boolean, optional): Show only items below minimum stock
- `belowReorderPoint` (boolean, optional): Show only items below reorder point
- `zeroStock` (boolean, optional): Show only items with zero stock

Response includes:
- List of stock summaries with quantities, values, and status indicators
- Totals for all items

### Stock Value Report
```
GET /api/inventory/reports/stock-value
```

Query Parameters:
- `itemId` (string, required): Item ID

Response:
```json
{
  "itemId": "item-id",
  "availableStock": 150,
  "stockValue": 67500,
  "averageCost": 450
}
```

### Expiring Lots Report
```
GET /api/inventory/reports/expiring-lots
```

Query Parameters:
- `daysAhead` (number, optional): Days to look ahead (default: 30)

Response includes:
- List of expiring lots
- Summary with counts by expiry status

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` Bad Request - Invalid input or business rule violation
- `401` Unauthorized - Authentication required
- `404` Not Found - Resource not found
- `409` Conflict - Duplicate resource (e.g., duplicate code)
- `500` Internal Server Error - Server error

## Rate Limiting
API endpoints are rate-limited to prevent abuse. Current limits:
- 100 requests per minute per user
- 1000 requests per hour per user