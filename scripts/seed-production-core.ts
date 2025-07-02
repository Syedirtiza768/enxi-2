#!/usr/bin/env tsx
// Core system seed - includes only essential system data
// Generated on: 2025-07-02T05:44:54.813Z
// This seed excludes: customers, suppliers, items, sales, inventory, and procurement data

import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedCompanySettings() {
  console.log('🏢 Seeding company settings...');
  const settings = [
  {
    "id": "cmcd8ueft001ev2dpqqbolc2w",
    "companyName": "UAE Marine Engine Maintenance LLC",
    "address": "Jebel Ali Free Zone, Dubai, UAE",
    "phone": "+971 4 123 4567",
    "email": "info@uaemarine.ae",
    "website": "www.uaemarine.ae",
    "logoUrl": null,
    "defaultCurrency": "AED",
    "defaultTaxRateId": null,
    "taxRegistrationNumber": "100234567890123",
    "quotationTermsAndConditions": null,
    "quotationFooterNotes": null,
    "quotationValidityDays": 30,
    "quotationPrefix": "QUOT",
    "quotationNumberFormat": "PREFIX-YYYY-NNNN",
    "orderPrefix": "SO",
    "orderNumberFormat": "PREFIX-YYYY-NNNN",
    "defaultOrderPaymentTerms": "30 days net",
    "defaultOrderShippingTerms": null,
    "defaultShippingMethod": null,
    "autoReserveInventory": true,
    "requireCustomerPO": true,
    "orderApprovalThreshold": null,
    "orderConfirmationTemplate": null,
    "showCompanyLogoOnQuotations": true,
    "showCompanyLogoOnOrders": true,
    "showTaxBreakdown": true,
    "defaultInventoryAccountId": null,
    "defaultCogsAccountId": null,
    "defaultSalesAccountId": null,
    "defaultExpenseAccountId": null,
    "defaultTrackInventory": true,
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.753Z",
    "updatedAt": "2025-06-27T21:34:11.972Z",
    "updatedBy": "system"
  }
];
  
  for (const setting of settings) {
    await prisma.companySettings.create({
      data: {
        ...setting,
        createdAt: new Date(setting.createdAt),
        updatedAt: new Date(setting.updatedAt)
      }
    });
  }
  console.log('✅ Company settings seeded');
}

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');
  const permissions = [
  {
    "id": "cmcd9idoh0000v267dker3mwr",
    "code": "shipments.read",
    "name": "View Shipments",
    "description": "View shipment details",
    "module": "shipments",
    "action": "read",
    "createdAt": "2025-06-26T10:50:32.506Z"
  },
  {
    "id": "cmcd9idq60001v267in77l6m7",
    "code": "shipments.create",
    "name": "Create Shipments",
    "description": "Create new shipments",
    "module": "shipments",
    "action": "create",
    "createdAt": "2025-06-26T10:50:32.575Z"
  },
  {
    "id": "cmcd9idqf0002v2679qh2mnwp",
    "code": "shipments.update",
    "name": "Update Shipments",
    "description": "Update shipment information",
    "module": "shipments",
    "action": "update",
    "createdAt": "2025-06-26T10:50:32.583Z"
  },
  {
    "id": "cmcd9idr60003v267d00caka9",
    "code": "shipments.delete",
    "name": "Delete Shipments",
    "description": "Delete shipments",
    "module": "shipments",
    "action": "delete",
    "createdAt": "2025-06-26T10:50:32.610Z"
  },
  {
    "id": "cmcd9ids10004v267wq6ni3c5",
    "code": "shipments.manage",
    "name": "Manage Shipments",
    "description": "Manage all shipments",
    "module": "shipments",
    "action": "manage",
    "createdAt": "2025-06-26T10:50:32.642Z"
  },
  {
    "id": "cmcfawne40000v255pay9ww3o",
    "code": "roles.permissions",
    "name": "Manage Role Permissions",
    "description": "Manage permissions for roles",
    "module": "roles",
    "action": "permissions",
    "createdAt": "2025-06-27T21:05:10.252Z"
  },
  {
    "id": "cmcfawnf50005v255r0vhhlqr",
    "code": "roles.view",
    "name": "View Roles",
    "description": "View roles and their permissions",
    "module": "roles",
    "action": "view",
    "createdAt": "2025-06-27T21:05:10.289Z"
  },
  {
    "id": "cmcfawnfh000av255qu40gbic",
    "code": "roles.create",
    "name": "Create Roles",
    "description": "Create new roles",
    "module": "roles",
    "action": "create",
    "createdAt": "2025-06-27T21:05:10.301Z"
  },
  {
    "id": "cmcfawnfs000fv2555kxx1bc6",
    "code": "roles.update",
    "name": "Update Roles",
    "description": "Update existing roles",
    "module": "roles",
    "action": "update",
    "createdAt": "2025-06-27T21:05:10.313Z"
  },
  {
    "id": "cmcfawng3000kv255r113oh3u",
    "code": "roles.delete",
    "name": "Delete Roles",
    "description": "Delete roles",
    "module": "roles",
    "action": "delete",
    "createdAt": "2025-06-27T21:05:10.323Z"
  },
  {
    "id": "cmcfbja0k0000v2ykjqvwqeoc",
    "code": "sales_team.read",
    "name": "View Sales Team",
    "description": "View sales team information",
    "module": "sales_team",
    "action": "read",
    "createdAt": "2025-06-27T21:22:46.005Z"
  },
  {
    "id": "cmcfbja0v0001v2ykl384bfgy",
    "code": "sales_team.update",
    "name": "Update Sales Team",
    "description": "Update sales team details",
    "module": "sales_team",
    "action": "update",
    "createdAt": "2025-06-27T21:22:46.016Z"
  },
  {
    "id": "cmcfbja0z0002v2yk2vrns9sk",
    "code": "sales_team.assign",
    "name": "Assign Sales Team",
    "description": "Assign customers and leads to sales reps",
    "module": "sales_team",
    "action": "assign",
    "createdAt": "2025-06-27T21:22:46.020Z"
  },
  {
    "id": "cmcfbja130003v2ykds9mtdml",
    "code": "sales_team.view_all",
    "name": "View All Sales Teams",
    "description": "View all sales team members across organization",
    "module": "sales_team",
    "action": "view_all",
    "createdAt": "2025-06-27T21:22:46.023Z"
  },
  {
    "id": "cmckgli4n0000v2oy3h5myof4",
    "code": "users.create",
    "name": "Create Users",
    "description": "Create new users",
    "module": "users",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.790Z"
  },
  {
    "id": "cmckgli580001v2oytsoqhuew",
    "code": "users.read",
    "name": "View Users",
    "description": "View user details",
    "module": "users",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.812Z"
  },
  {
    "id": "cmckgli5g0002v2oyl1w7k5ib",
    "code": "users.update",
    "name": "Update Users",
    "description": "Update user information",
    "module": "users",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.820Z"
  },
  {
    "id": "cmckgli5l0003v2oylb5hb80z",
    "code": "users.delete",
    "name": "Delete Users",
    "description": "Delete users",
    "module": "users",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.825Z"
  },
  {
    "id": "cmckgli5p0004v2oyiscbypw9",
    "code": "users.manage_roles",
    "name": "Manage User Roles",
    "description": "Assign and manage user roles",
    "module": "users",
    "action": "manage_roles",
    "createdAt": "2025-07-01T11:43:18.829Z"
  },
  {
    "id": "cmckgli5t0005v2oyiz3glyo7",
    "code": "users.manage_permissions",
    "name": "Manage User Permissions",
    "description": "Manage user-specific permissions",
    "module": "users",
    "action": "manage_permissions",
    "createdAt": "2025-07-01T11:43:18.833Z"
  },
  {
    "id": "cmckgli5w0006v2oy4vv56uuv",
    "code": "sales_team.create",
    "name": "Create Sales Team Members",
    "description": "Add new sales team members",
    "module": "sales_team",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.836Z"
  },
  {
    "id": "cmckgli680009v2oy5z509tsf",
    "code": "sales_team.delete",
    "name": "Delete Sales Team Members",
    "description": "Remove sales team members",
    "module": "sales_team",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.848Z"
  },
  {
    "id": "cmckgli6i000cv2oy3e7gaq2i",
    "code": "sales_cases.create",
    "name": "Create Sales Cases",
    "description": "Create new sales cases",
    "module": "sales_cases",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.859Z"
  },
  {
    "id": "cmckgli6m000dv2oyjim8r5ak",
    "code": "sales_cases.read",
    "name": "View Sales Cases",
    "description": "View sales case details",
    "module": "sales_cases",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.862Z"
  },
  {
    "id": "cmckgli6q000ev2oy8uvntst9",
    "code": "sales_cases.update",
    "name": "Update Sales Cases",
    "description": "Update sales case information",
    "module": "sales_cases",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.867Z"
  },
  {
    "id": "cmckgli6u000fv2oyy8w19gu3",
    "code": "sales_cases.delete",
    "name": "Delete Sales Cases",
    "description": "Delete sales cases",
    "module": "sales_cases",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.870Z"
  },
  {
    "id": "cmckgli6x000gv2oy7b5mdipm",
    "code": "sales_cases.close",
    "name": "Close Sales Cases",
    "description": "Close and finalize sales cases",
    "module": "sales_cases",
    "action": "close",
    "createdAt": "2025-07-01T11:43:18.874Z"
  },
  {
    "id": "cmckgli70000hv2oyh0j463oe",
    "code": "sales_cases.view_all",
    "name": "View All Sales Cases",
    "description": "View all sales cases across organization",
    "module": "sales_cases",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:18.877Z"
  },
  {
    "id": "cmckgli74000iv2oygsxtswe9",
    "code": "sales_cases.view_team",
    "name": "View Team Sales Cases",
    "description": "View sales cases of team members",
    "module": "sales_cases",
    "action": "view_team",
    "createdAt": "2025-07-01T11:43:18.880Z"
  },
  {
    "id": "cmckgli78000jv2oybhjrpxww",
    "code": "sales_cases.manage_expenses",
    "name": "Manage Case Expenses",
    "description": "Add and manage sales case expenses",
    "module": "sales_cases",
    "action": "manage_expenses",
    "createdAt": "2025-07-01T11:43:18.884Z"
  },
  {
    "id": "cmckgli7b000kv2oyojx7lu1d",
    "code": "leads.create",
    "name": "Create Leads",
    "description": "Create new leads",
    "module": "leads",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.888Z"
  },
  {
    "id": "cmckgli7e000lv2oyur9ys6ws",
    "code": "leads.read",
    "name": "View Leads",
    "description": "View lead details",
    "module": "leads",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.891Z"
  },
  {
    "id": "cmckgli7i000mv2oyt7dqr6zr",
    "code": "leads.update",
    "name": "Update Leads",
    "description": "Update lead information",
    "module": "leads",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.894Z"
  },
  {
    "id": "cmckgli7m000nv2oydzmszwae",
    "code": "leads.delete",
    "name": "Delete Leads",
    "description": "Delete leads",
    "module": "leads",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.898Z"
  },
  {
    "id": "cmckgli7p000ov2oyr9da4x2o",
    "code": "leads.convert",
    "name": "Convert Leads",
    "description": "Convert leads to customers",
    "module": "leads",
    "action": "convert",
    "createdAt": "2025-07-01T11:43:18.901Z"
  },
  {
    "id": "cmckgli7s000pv2oy32r20ply",
    "code": "leads.view_all",
    "name": "View All Leads",
    "description": "View all leads across organization",
    "module": "leads",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:18.905Z"
  },
  {
    "id": "cmckgli7w000qv2oyjvun0fhw",
    "code": "customers.create",
    "name": "Create Customers",
    "description": "Create new customers",
    "module": "customers",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.908Z"
  },
  {
    "id": "cmckgli7z000rv2oy1sfc0t33",
    "code": "customers.read",
    "name": "View Customers",
    "description": "View customer details",
    "module": "customers",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.911Z"
  },
  {
    "id": "cmckgli85000sv2oycd6qrm0r",
    "code": "customers.update",
    "name": "Update Customers",
    "description": "Update customer information",
    "module": "customers",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.918Z"
  },
  {
    "id": "cmckgli8a000tv2oy9vqmqe0z",
    "code": "customers.delete",
    "name": "Delete Customers",
    "description": "Delete customers",
    "module": "customers",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.923Z"
  },
  {
    "id": "cmckgli8d000uv2oy3r0340hp",
    "code": "customers.manage_credit",
    "name": "Manage Customer Credit",
    "description": "Manage customer credit limits and terms",
    "module": "customers",
    "action": "manage_credit",
    "createdAt": "2025-07-01T11:43:18.926Z"
  },
  {
    "id": "cmckgli8h000vv2oyvuaw7oqd",
    "code": "customers.view_all",
    "name": "View All Customers",
    "description": "View all customers across organization",
    "module": "customers",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:18.929Z"
  },
  {
    "id": "cmckgli8l000wv2oya77rfbdv",
    "code": "quotations.create",
    "name": "Create Quotations",
    "description": "Create new quotations",
    "module": "quotations",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.933Z"
  },
  {
    "id": "cmckgli8p000xv2oyvrlbwthg",
    "code": "quotations.read",
    "name": "View Quotations",
    "description": "View quotation details",
    "module": "quotations",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.937Z"
  },
  {
    "id": "cmckgli8t000yv2oy9elj3pyw",
    "code": "quotations.update",
    "name": "Update Quotations",
    "description": "Update quotation information",
    "module": "quotations",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.941Z"
  },
  {
    "id": "cmckgli8x000zv2oyh2h7o06u",
    "code": "quotations.delete",
    "name": "Delete Quotations",
    "description": "Delete quotations",
    "module": "quotations",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.945Z"
  },
  {
    "id": "cmckgli900010v2oyph6fzi1q",
    "code": "quotations.approve",
    "name": "Approve Quotations",
    "description": "Approve quotations for sending",
    "module": "quotations",
    "action": "approve",
    "createdAt": "2025-07-01T11:43:18.949Z"
  },
  {
    "id": "cmckgli940011v2oyxk9zruje",
    "code": "quotations.send",
    "name": "Send Quotations",
    "description": "Send quotations to customers",
    "module": "quotations",
    "action": "send",
    "createdAt": "2025-07-01T11:43:18.952Z"
  },
  {
    "id": "cmckgli970012v2oyxp6wnydl",
    "code": "quotations.convert",
    "name": "Convert Quotations",
    "description": "Convert quotations to sales orders",
    "module": "quotations",
    "action": "convert",
    "createdAt": "2025-07-01T11:43:18.956Z"
  },
  {
    "id": "cmckgli9b0013v2oygc9ihyyl",
    "code": "quotations.view_all",
    "name": "View All Quotations",
    "description": "View all quotations across organization",
    "module": "quotations",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:18.959Z"
  },
  {
    "id": "cmckgli9f0014v2oyuve5mo78",
    "code": "sales_orders.create",
    "name": "Create Sales Orders",
    "description": "Create new sales orders",
    "module": "sales_orders",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.963Z"
  },
  {
    "id": "cmckgli9j0015v2oyf7vxwk27",
    "code": "sales_orders.read",
    "name": "View Sales Orders",
    "description": "View sales order details",
    "module": "sales_orders",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.967Z"
  },
  {
    "id": "cmckgli9m0016v2oyupyaqbif",
    "code": "sales_orders.update",
    "name": "Update Sales Orders",
    "description": "Update sales order information",
    "module": "sales_orders",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.971Z"
  },
  {
    "id": "cmckgli9q0017v2oy2w8toy5y",
    "code": "sales_orders.delete",
    "name": "Delete Sales Orders",
    "description": "Delete sales orders",
    "module": "sales_orders",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.974Z"
  },
  {
    "id": "cmckgli9t0018v2oyyts54bgf",
    "code": "sales_orders.approve",
    "name": "Approve Sales Orders",
    "description": "Approve sales orders",
    "module": "sales_orders",
    "action": "approve",
    "createdAt": "2025-07-01T11:43:18.978Z"
  },
  {
    "id": "cmckgli9x0019v2oy9k5k3o6w",
    "code": "sales_orders.cancel",
    "name": "Cancel Sales Orders",
    "description": "Cancel sales orders",
    "module": "sales_orders",
    "action": "cancel",
    "createdAt": "2025-07-01T11:43:18.981Z"
  },
  {
    "id": "cmckglia0001av2oyt3ej464w",
    "code": "sales_orders.view_all",
    "name": "View All Sales Orders",
    "description": "View all sales orders across organization",
    "module": "sales_orders",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:18.984Z"
  },
  {
    "id": "cmckglia3001bv2oyihiacgxm",
    "code": "inventory.create",
    "name": "Create Inventory Items",
    "description": "Create new inventory items",
    "module": "inventory",
    "action": "create",
    "createdAt": "2025-07-01T11:43:18.988Z"
  },
  {
    "id": "cmckglia7001cv2oyays5zlo9",
    "code": "inventory.read",
    "name": "View Inventory",
    "description": "View inventory details",
    "module": "inventory",
    "action": "read",
    "createdAt": "2025-07-01T11:43:18.992Z"
  },
  {
    "id": "cmckgliab001dv2oyvncxrqqf",
    "code": "inventory.update",
    "name": "Update Inventory",
    "description": "Update inventory information",
    "module": "inventory",
    "action": "update",
    "createdAt": "2025-07-01T11:43:18.995Z"
  },
  {
    "id": "cmckgliaf001ev2oyscab7rrb",
    "code": "inventory.delete",
    "name": "Delete Inventory Items",
    "description": "Delete inventory items",
    "module": "inventory",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:18.999Z"
  },
  {
    "id": "cmckgliaj001fv2oyavvsbqsk",
    "code": "inventory.adjust",
    "name": "Adjust Inventory",
    "description": "Make inventory adjustments",
    "module": "inventory",
    "action": "adjust",
    "createdAt": "2025-07-01T11:43:19.003Z"
  },
  {
    "id": "cmckglian001gv2oy5gbu21ja",
    "code": "inventory.transfer",
    "name": "Transfer Inventory",
    "description": "Transfer inventory between locations",
    "module": "inventory",
    "action": "transfer",
    "createdAt": "2025-07-01T11:43:19.007Z"
  },
  {
    "id": "cmckgliaq001hv2oyn1kmeiik",
    "code": "inventory.count",
    "name": "Count Inventory",
    "description": "Perform physical inventory counts",
    "module": "inventory",
    "action": "count",
    "createdAt": "2025-07-01T11:43:19.010Z"
  },
  {
    "id": "cmckgliau001iv2oyf03bgqgy",
    "code": "inventory.view_costs",
    "name": "View Inventory Costs",
    "description": "View inventory cost information",
    "module": "inventory",
    "action": "view_costs",
    "createdAt": "2025-07-01T11:43:19.014Z"
  },
  {
    "id": "cmckgliax001jv2oymk0zjjzq",
    "code": "inventory.manage_categories",
    "name": "Manage Categories",
    "description": "Manage inventory categories",
    "module": "inventory",
    "action": "manage_categories",
    "createdAt": "2025-07-01T11:43:19.018Z"
  },
  {
    "id": "cmckglibf001ov2oym62e17t5",
    "code": "shipments.confirm",
    "name": "Confirm Shipments",
    "description": "Confirm shipments",
    "module": "shipments",
    "action": "confirm",
    "createdAt": "2025-07-01T11:43:19.035Z"
  },
  {
    "id": "cmckglibi001pv2oyad3w0gtl",
    "code": "shipments.deliver",
    "name": "Mark as Delivered",
    "description": "Mark shipments as delivered",
    "module": "shipments",
    "action": "deliver",
    "createdAt": "2025-07-01T11:43:19.039Z"
  },
  {
    "id": "cmckglibm001qv2oyek8kgfa5",
    "code": "shipments.cancel",
    "name": "Cancel Shipments",
    "description": "Cancel shipments",
    "module": "shipments",
    "action": "cancel",
    "createdAt": "2025-07-01T11:43:19.042Z"
  },
  {
    "id": "cmckglibq001rv2oy8objq60z",
    "code": "shipments.view_all",
    "name": "View All Shipments",
    "description": "View all shipments across organization",
    "module": "shipments",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:19.046Z"
  },
  {
    "id": "cmckglibt001sv2oyezjiex8j",
    "code": "accounting.create_journal",
    "name": "Create Journal Entries",
    "description": "Create journal entries",
    "module": "accounting",
    "action": "create_journal",
    "createdAt": "2025-07-01T11:43:19.050Z"
  },
  {
    "id": "cmckglibx001tv2oyob2jco5d",
    "code": "accounting.post_journal",
    "name": "Post Journal Entries",
    "description": "Post journal entries",
    "module": "accounting",
    "action": "post_journal",
    "createdAt": "2025-07-01T11:43:19.053Z"
  },
  {
    "id": "cmckglic2001uv2oy8alxvh42",
    "code": "accounting.view_journals",
    "name": "View Journal Entries",
    "description": "View journal entries",
    "module": "accounting",
    "action": "view_journals",
    "createdAt": "2025-07-01T11:43:19.058Z"
  },
  {
    "id": "cmckglic6001vv2oyu569z5mr",
    "code": "accounting.manage_accounts",
    "name": "Manage Chart of Accounts",
    "description": "Manage chart of accounts",
    "module": "accounting",
    "action": "manage_accounts",
    "createdAt": "2025-07-01T11:43:19.063Z"
  },
  {
    "id": "cmckglica001wv2oys7xtgbd2",
    "code": "accounting.view_reports",
    "name": "View Financial Reports",
    "description": "View financial reports",
    "module": "accounting",
    "action": "view_reports",
    "createdAt": "2025-07-01T11:43:19.066Z"
  },
  {
    "id": "cmckglicd001xv2oy70grl1st",
    "code": "accounting.close_period",
    "name": "Close Accounting Period",
    "description": "Close accounting periods",
    "module": "accounting",
    "action": "close_period",
    "createdAt": "2025-07-01T11:43:19.069Z"
  },
  {
    "id": "cmckglicg001yv2oyv0ez23te",
    "code": "accounting.view_all",
    "name": "View All Accounting",
    "description": "Full access to accounting module",
    "module": "accounting",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:19.073Z"
  },
  {
    "id": "cmckglick001zv2oypd05x3gg",
    "code": "invoices.create",
    "name": "Create Invoices",
    "description": "Create new invoices",
    "module": "invoices",
    "action": "create",
    "createdAt": "2025-07-01T11:43:19.076Z"
  },
  {
    "id": "cmckglicn0020v2oyhqdrdeim",
    "code": "invoices.read",
    "name": "View Invoices",
    "description": "View invoice details",
    "module": "invoices",
    "action": "read",
    "createdAt": "2025-07-01T11:43:19.080Z"
  },
  {
    "id": "cmckglicr0021v2oy6hmmcnsm",
    "code": "invoices.update",
    "name": "Update Invoices",
    "description": "Update invoice information",
    "module": "invoices",
    "action": "update",
    "createdAt": "2025-07-01T11:43:19.083Z"
  },
  {
    "id": "cmckglicu0022v2oymdyx7nzb",
    "code": "invoices.delete",
    "name": "Delete Invoices",
    "description": "Delete invoices",
    "module": "invoices",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:19.086Z"
  },
  {
    "id": "cmckglicx0023v2oyxxdlim93",
    "code": "invoices.send",
    "name": "Send Invoices",
    "description": "Send invoices to customers",
    "module": "invoices",
    "action": "send",
    "createdAt": "2025-07-01T11:43:19.090Z"
  },
  {
    "id": "cmckglid00024v2oy0mwlw34i",
    "code": "invoices.void",
    "name": "Void Invoices",
    "description": "Void invoices",
    "module": "invoices",
    "action": "void",
    "createdAt": "2025-07-01T11:43:19.093Z"
  },
  {
    "id": "cmckglid40025v2oy45gjd85z",
    "code": "invoices.view_all",
    "name": "View All Invoices",
    "description": "View all invoices across organization",
    "module": "invoices",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:19.096Z"
  },
  {
    "id": "cmckglid80026v2oywa7xgmd2",
    "code": "payments.create",
    "name": "Record Payments",
    "description": "Record customer payments",
    "module": "payments",
    "action": "create",
    "createdAt": "2025-07-01T11:43:19.100Z"
  },
  {
    "id": "cmckglidb0027v2oymv4y1089",
    "code": "payments.read",
    "name": "View Payments",
    "description": "View payment details",
    "module": "payments",
    "action": "read",
    "createdAt": "2025-07-01T11:43:19.103Z"
  },
  {
    "id": "cmckglide0028v2oy1cquvpz2",
    "code": "payments.update",
    "name": "Update Payments",
    "description": "Update payment information",
    "module": "payments",
    "action": "update",
    "createdAt": "2025-07-01T11:43:19.107Z"
  },
  {
    "id": "cmckglidi0029v2oy45ah4rck",
    "code": "payments.delete",
    "name": "Delete Payments",
    "description": "Delete payment records",
    "module": "payments",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:19.110Z"
  },
  {
    "id": "cmckglidl002av2oy0aecagef",
    "code": "payments.refund",
    "name": "Process Refunds",
    "description": "Process payment refunds",
    "module": "payments",
    "action": "refund",
    "createdAt": "2025-07-01T11:43:19.114Z"
  },
  {
    "id": "cmckglidp002bv2oyr9y9in3k",
    "code": "payments.view_all",
    "name": "View All Payments",
    "description": "View all payments across organization",
    "module": "payments",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:19.117Z"
  },
  {
    "id": "cmckglidt002cv2oy1fz2s8e1",
    "code": "purchase_orders.create",
    "name": "Create Purchase Orders",
    "description": "Create new purchase orders",
    "module": "purchase_orders",
    "action": "create",
    "createdAt": "2025-07-01T11:43:19.121Z"
  },
  {
    "id": "cmckglidw002dv2oy9y0vnv3z",
    "code": "purchase_orders.read",
    "name": "View Purchase Orders",
    "description": "View purchase order details",
    "module": "purchase_orders",
    "action": "read",
    "createdAt": "2025-07-01T11:43:19.124Z"
  },
  {
    "id": "cmckglidz002ev2oyzmo64qpt",
    "code": "purchase_orders.update",
    "name": "Update Purchase Orders",
    "description": "Update purchase order information",
    "module": "purchase_orders",
    "action": "update",
    "createdAt": "2025-07-01T11:43:19.128Z"
  },
  {
    "id": "cmckglie3002fv2oyupa5s521",
    "code": "purchase_orders.delete",
    "name": "Delete Purchase Orders",
    "description": "Delete purchase orders",
    "module": "purchase_orders",
    "action": "delete",
    "createdAt": "2025-07-01T11:43:19.131Z"
  },
  {
    "id": "cmckglie6002gv2oy79apj2gt",
    "code": "purchase_orders.approve",
    "name": "Approve Purchase Orders",
    "description": "Approve purchase orders",
    "module": "purchase_orders",
    "action": "approve",
    "createdAt": "2025-07-01T11:43:19.134Z"
  },
  {
    "id": "cmckglie9002hv2oy3mo5k34d",
    "code": "purchase_orders.receive",
    "name": "Receive Goods",
    "description": "Receive goods against purchase orders",
    "module": "purchase_orders",
    "action": "receive",
    "createdAt": "2025-07-01T11:43:19.138Z"
  },
  {
    "id": "cmckglied002iv2oyvyv6xegu",
    "code": "purchase_orders.view_all",
    "name": "View All Purchase Orders",
    "description": "View all purchase orders",
    "module": "purchase_orders",
    "action": "view_all",
    "createdAt": "2025-07-01T11:43:19.141Z"
  },
  {
    "id": "cmckglieh002jv2oytacr2oev",
    "code": "system.view_logs",
    "name": "View System Logs",
    "description": "View system and audit logs",
    "module": "system",
    "action": "view_logs",
    "createdAt": "2025-07-01T11:43:19.145Z"
  },
  {
    "id": "cmckgliek002kv2oynzle9hap",
    "code": "system.manage_settings",
    "name": "Manage System Settings",
    "description": "Manage system configuration",
    "module": "system",
    "action": "manage_settings",
    "createdAt": "2025-07-01T11:43:19.148Z"
  },
  {
    "id": "cmckglien002lv2oyrrh41do1",
    "code": "system.backup",
    "name": "Backup System",
    "description": "Perform system backups",
    "module": "system",
    "action": "backup",
    "createdAt": "2025-07-01T11:43:19.151Z"
  },
  {
    "id": "cmckglieq002mv2oy5ul34bi9",
    "code": "system.restore",
    "name": "Restore System",
    "description": "Restore system from backup",
    "module": "system",
    "action": "restore",
    "createdAt": "2025-07-01T11:43:19.154Z"
  },
  {
    "id": "cmckgliet002nv2oyypp5k0u1",
    "code": "system.health_check",
    "name": "View System Health",
    "description": "View system health and performance",
    "module": "system",
    "action": "health_check",
    "createdAt": "2025-07-01T11:43:19.158Z"
  },
  {
    "id": "cmckgliex002ov2oy8quxopyk",
    "code": "system.manage_integrations",
    "name": "Manage Integrations",
    "description": "Manage third-party integrations",
    "module": "system",
    "action": "manage_integrations",
    "createdAt": "2025-07-01T11:43:19.161Z"
  },
  {
    "id": "cmckglif0002pv2oyo9is7rvk",
    "code": "reports.sales",
    "name": "View Sales Reports",
    "description": "View sales analytics and reports",
    "module": "reports",
    "action": "sales",
    "createdAt": "2025-07-01T11:43:19.164Z"
  },
  {
    "id": "cmckglif3002qv2oy76dyb5kn",
    "code": "reports.financial",
    "name": "View Financial Reports",
    "description": "View financial reports",
    "module": "reports",
    "action": "financial",
    "createdAt": "2025-07-01T11:43:19.168Z"
  },
  {
    "id": "cmckglif7002rv2oyyiuffxec",
    "code": "reports.inventory",
    "name": "View Inventory Reports",
    "description": "View inventory reports",
    "module": "reports",
    "action": "inventory",
    "createdAt": "2025-07-01T11:43:19.171Z"
  },
  {
    "id": "cmckglifb002sv2oyr4boidmv",
    "code": "reports.customer",
    "name": "View Customer Reports",
    "description": "View customer analytics",
    "module": "reports",
    "action": "customer",
    "createdAt": "2025-07-01T11:43:19.175Z"
  },
  {
    "id": "cmckglife002tv2oyhdx70b6d",
    "code": "reports.export",
    "name": "Export Reports",
    "description": "Export reports to various formats",
    "module": "reports",
    "action": "export",
    "createdAt": "2025-07-01T11:43:19.179Z"
  },
  {
    "id": "cmckglifi002uv2oybouy8wqb",
    "code": "reports.custom",
    "name": "Create Custom Reports",
    "description": "Create and manage custom reports",
    "module": "reports",
    "action": "custom",
    "createdAt": "2025-07-01T11:43:19.182Z"
  },
  {
    "id": "cmckyu5v00000v2lyw8zvvz7g",
    "code": "sales_orders.process",
    "name": "Process Sales Orders",
    "description": "Start processing sales orders",
    "module": "sales_orders",
    "action": "process",
    "createdAt": "2025-07-01T20:13:55.884Z"
  }
];
  
  for (const permission of permissions) {
    await prisma.permission.create({ data: permission });
  }
  console.log('✅ Permissions seeded');
}

async function seedRolePermissions() {
  console.log('👥 Assigning permissions to roles...');
  const rolePermissions = [
  {
    "id": "cmckgmawo002xv2qbj66i5pl8",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli4n0000v2oy3h5myof4",
    "createdAt": "2025-07-01T11:43:56.088Z"
  },
  {
    "id": "cmckgmaws002zv2qb3puloeo5",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli580001v2oytsoqhuew",
    "createdAt": "2025-07-01T11:43:56.092Z"
  },
  {
    "id": "cmckgmawv0031v2qb56stzerw",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli5g0002v2oyl1w7k5ib",
    "createdAt": "2025-07-01T11:43:56.096Z"
  },
  {
    "id": "cmckgmawz0033v2qbcp70bapc",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli5l0003v2oylb5hb80z",
    "createdAt": "2025-07-01T11:43:56.100Z"
  },
  {
    "id": "cmckgmax30035v2qb4077n1s9",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli5p0004v2oyiscbypw9",
    "createdAt": "2025-07-01T11:43:56.104Z"
  },
  {
    "id": "cmckgmax80037v2qbm0g9p560",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli5t0005v2oyiz3glyo7",
    "createdAt": "2025-07-01T11:43:56.108Z"
  },
  {
    "id": "cmckgmaxd0039v2qbzv1chnlk",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli5w0006v2oy4vv56uuv",
    "createdAt": "2025-07-01T11:43:56.113Z"
  },
  {
    "id": "cmckgmaxi003bv2qbm0e52kc0",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcfbja0k0000v2ykjqvwqeoc",
    "createdAt": "2025-07-01T11:43:56.118Z"
  },
  {
    "id": "cmckgmaxm003dv2qbkjgtnzqb",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcfbja0v0001v2ykl384bfgy",
    "createdAt": "2025-07-01T11:43:56.122Z"
  },
  {
    "id": "cmckgmaxp003fv2qbfgfu928z",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli680009v2oy5z509tsf",
    "createdAt": "2025-07-01T11:43:56.126Z"
  },
  {
    "id": "cmckgmaxt003hv2qbmxn58343",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcfbja0z0002v2yk2vrns9sk",
    "createdAt": "2025-07-01T11:43:56.130Z"
  },
  {
    "id": "cmckgmay1003jv2qbhaedkbhu",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcfbja130003v2ykds9mtdml",
    "createdAt": "2025-07-01T11:43:56.137Z"
  },
  {
    "id": "cmckgmay4003lv2qb29zq0d2j",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli6i000cv2oy3e7gaq2i",
    "createdAt": "2025-07-01T11:43:56.141Z"
  },
  {
    "id": "cmckgmay8003nv2qbehdfbux4",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli6m000dv2oyjim8r5ak",
    "createdAt": "2025-07-01T11:43:56.144Z"
  },
  {
    "id": "cmckgmayc003pv2qb4t7th0f7",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli6q000ev2oy8uvntst9",
    "createdAt": "2025-07-01T11:43:56.148Z"
  },
  {
    "id": "cmckgmayg003rv2qbr4vehp7d",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli6u000fv2oyy8w19gu3",
    "createdAt": "2025-07-01T11:43:56.152Z"
  },
  {
    "id": "cmckgmayj003tv2qb4iiwqudq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli6x000gv2oy7b5mdipm",
    "createdAt": "2025-07-01T11:43:56.156Z"
  },
  {
    "id": "cmckgmayn003vv2qb1ktmp5qt",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli70000hv2oyh0j463oe",
    "createdAt": "2025-07-01T11:43:56.160Z"
  },
  {
    "id": "cmckgmays003xv2qbirg421vr",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli74000iv2oygsxtswe9",
    "createdAt": "2025-07-01T11:43:56.165Z"
  },
  {
    "id": "cmckgmayz003zv2qbf53nyym1",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli78000jv2oybhjrpxww",
    "createdAt": "2025-07-01T11:43:56.171Z"
  },
  {
    "id": "cmckgmaz30041v2qbxw2dn0c3",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7b000kv2oyojx7lu1d",
    "createdAt": "2025-07-01T11:43:56.175Z"
  },
  {
    "id": "cmckgmaz60043v2qba3rrs5gi",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7e000lv2oyur9ys6ws",
    "createdAt": "2025-07-01T11:43:56.179Z"
  },
  {
    "id": "cmckgmazb0045v2qbfpuaz5f7",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7i000mv2oyt7dqr6zr",
    "createdAt": "2025-07-01T11:43:56.183Z"
  },
  {
    "id": "cmckgmaze0047v2qbj540eqls",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7m000nv2oydzmszwae",
    "createdAt": "2025-07-01T11:43:56.187Z"
  },
  {
    "id": "cmckgmazi0049v2qbkmr7ka71",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7p000ov2oyr9da4x2o",
    "createdAt": "2025-07-01T11:43:56.190Z"
  },
  {
    "id": "cmckgmazm004bv2qbcbr01ds6",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7s000pv2oy32r20ply",
    "createdAt": "2025-07-01T11:43:56.194Z"
  },
  {
    "id": "cmckgmazr004dv2qb8a8kxrso",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7w000qv2oyjvun0fhw",
    "createdAt": "2025-07-01T11:43:56.199Z"
  },
  {
    "id": "cmckgmazv004fv2qb3gnadolx",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:56.203Z"
  },
  {
    "id": "cmckgmazz004hv2qbhl9lidgf",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli85000sv2oycd6qrm0r",
    "createdAt": "2025-07-01T11:43:56.207Z"
  },
  {
    "id": "cmckgmb03004jv2qbt1kqyxs8",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8a000tv2oy9vqmqe0z",
    "createdAt": "2025-07-01T11:43:56.211Z"
  },
  {
    "id": "cmckgmb07004lv2qbd6c3s56o",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8d000uv2oy3r0340hp",
    "createdAt": "2025-07-01T11:43:56.215Z"
  },
  {
    "id": "cmckgmb0b004nv2qbc0g5f9fa",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8h000vv2oyvuaw7oqd",
    "createdAt": "2025-07-01T11:43:56.219Z"
  },
  {
    "id": "cmckgmb0f004pv2qb9ox7jaub",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8l000wv2oya77rfbdv",
    "createdAt": "2025-07-01T11:43:56.223Z"
  },
  {
    "id": "cmckgmb0j004rv2qbrcdapdp1",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8p000xv2oyvrlbwthg",
    "createdAt": "2025-07-01T11:43:56.228Z"
  },
  {
    "id": "cmckgmb0s004tv2qbge90us6x",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8t000yv2oy9elj3pyw",
    "createdAt": "2025-07-01T11:43:56.237Z"
  },
  {
    "id": "cmckgmb0w004vv2qbeqt0g6es",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli8x000zv2oyh2h7o06u",
    "createdAt": "2025-07-01T11:43:56.240Z"
  },
  {
    "id": "cmckgmb10004xv2qbhok0zht6",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli900010v2oyph6fzi1q",
    "createdAt": "2025-07-01T11:43:56.244Z"
  },
  {
    "id": "cmckgmb14004zv2qbejbh9jmi",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli940011v2oyxk9zruje",
    "createdAt": "2025-07-01T11:43:56.249Z"
  },
  {
    "id": "cmckgmb180051v2qbhzhgsykd",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli970012v2oyxp6wnydl",
    "createdAt": "2025-07-01T11:43:56.253Z"
  },
  {
    "id": "cmckgmb1c0053v2qbpinh2jft",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9b0013v2oygc9ihyyl",
    "createdAt": "2025-07-01T11:43:56.257Z"
  },
  {
    "id": "cmckgmb1g0055v2qbsa9zqf4d",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9f0014v2oyuve5mo78",
    "createdAt": "2025-07-01T11:43:56.261Z"
  },
  {
    "id": "cmckgmb1k0057v2qb7f5u05ke",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:56.265Z"
  },
  {
    "id": "cmckgmb1o0059v2qb3456jrx1",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9m0016v2oyupyaqbif",
    "createdAt": "2025-07-01T11:43:56.269Z"
  },
  {
    "id": "cmckgmb1s005bv2qbfrnrlma6",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9q0017v2oy2w8toy5y",
    "createdAt": "2025-07-01T11:43:56.273Z"
  },
  {
    "id": "cmckgmb1w005dv2qbvhjsisdv",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9t0018v2oyyts54bgf",
    "createdAt": "2025-07-01T11:43:56.277Z"
  },
  {
    "id": "cmckgmb21005fv2qbianblg3h",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgli9x0019v2oy9k5k3o6w",
    "createdAt": "2025-07-01T11:43:56.282Z"
  },
  {
    "id": "cmckgmb25005hv2qb9w45e1cu",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglia0001av2oyt3ej464w",
    "createdAt": "2025-07-01T11:43:56.286Z"
  },
  {
    "id": "cmckgmb29005jv2qbsiimvzfi",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglia3001bv2oyihiacgxm",
    "createdAt": "2025-07-01T11:43:56.290Z"
  },
  {
    "id": "cmckgmb2d005lv2qbrgjyaahu",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:56.293Z"
  },
  {
    "id": "cmckgmb2h005nv2qbmq35seh7",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliab001dv2oyvncxrqqf",
    "createdAt": "2025-07-01T11:43:56.297Z"
  },
  {
    "id": "cmckgmb2m005pv2qbxyq2o8lb",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliaf001ev2oyscab7rrb",
    "createdAt": "2025-07-01T11:43:56.302Z"
  },
  {
    "id": "cmckgmb2q005rv2qb1dqj2dnk",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliaj001fv2oyavvsbqsk",
    "createdAt": "2025-07-01T11:43:56.306Z"
  },
  {
    "id": "cmckgmb2u005tv2qbb54b54jq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglian001gv2oy5gbu21ja",
    "createdAt": "2025-07-01T11:43:56.310Z"
  },
  {
    "id": "cmckgmb2y005vv2qbuuswh3b9",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliaq001hv2oyn1kmeiik",
    "createdAt": "2025-07-01T11:43:56.314Z"
  },
  {
    "id": "cmckgmb32005xv2qbeg45k9vl",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliau001iv2oyf03bgqgy",
    "createdAt": "2025-07-01T11:43:56.318Z"
  },
  {
    "id": "cmckgmb36005zv2qbfykuo1ay",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliax001jv2oymk0zjjzq",
    "createdAt": "2025-07-01T11:43:56.322Z"
  },
  {
    "id": "cmckgmb3a0061v2qb4f1wll4u",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcd9idq60001v267in77l6m7",
    "createdAt": "2025-07-01T11:43:56.327Z"
  },
  {
    "id": "cmckgmb3f0063v2qbzh42rww0",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:56.331Z"
  },
  {
    "id": "cmckgmb3j0065v2qb9fggrvva",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcd9idqf0002v2679qh2mnwp",
    "createdAt": "2025-07-01T11:43:56.335Z"
  },
  {
    "id": "cmckgmb3n0067v2qbxmb9c642",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcd9idr60003v267d00caka9",
    "createdAt": "2025-07-01T11:43:56.339Z"
  },
  {
    "id": "cmckgmb3r0069v2qbk7obky64",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibf001ov2oym62e17t5",
    "createdAt": "2025-07-01T11:43:56.343Z"
  },
  {
    "id": "cmckgmb3v006bv2qb0h6z31nk",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibi001pv2oyad3w0gtl",
    "createdAt": "2025-07-01T11:43:56.347Z"
  },
  {
    "id": "cmckgmb41006dv2qba2afpizf",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibm001qv2oyek8kgfa5",
    "createdAt": "2025-07-01T11:43:56.353Z"
  },
  {
    "id": "cmckgmb44006fv2qbpl916i8i",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibq001rv2oy8objq60z",
    "createdAt": "2025-07-01T11:43:56.357Z"
  },
  {
    "id": "cmckgmb49006hv2qbzl1rqa65",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibt001sv2oyezjiex8j",
    "createdAt": "2025-07-01T11:43:56.361Z"
  },
  {
    "id": "cmckgmb4d006jv2qblyvpynio",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglibx001tv2oyob2jco5d",
    "createdAt": "2025-07-01T11:43:56.366Z"
  },
  {
    "id": "cmckgmb4h006lv2qbpk6armi3",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglic2001uv2oy8alxvh42",
    "createdAt": "2025-07-01T11:43:56.370Z"
  },
  {
    "id": "cmckgmb4l006nv2qbfqd4uwfq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglic6001vv2oyu569z5mr",
    "createdAt": "2025-07-01T11:43:56.374Z"
  },
  {
    "id": "cmckgmb4q006pv2qb7sckrurq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglica001wv2oys7xtgbd2",
    "createdAt": "2025-07-01T11:43:56.378Z"
  },
  {
    "id": "cmckgmb4v006rv2qb33vk1661",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicd001xv2oy70grl1st",
    "createdAt": "2025-07-01T11:43:56.383Z"
  },
  {
    "id": "cmckgmb4z006tv2qb98sq2xh5",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicg001yv2oyv0ez23te",
    "createdAt": "2025-07-01T11:43:56.388Z"
  },
  {
    "id": "cmckgmb53006vv2qbn6hr2q2g",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglick001zv2oypd05x3gg",
    "createdAt": "2025-07-01T11:43:56.392Z"
  },
  {
    "id": "cmckgmb57006xv2qb2w9y14sj",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:56.396Z"
  },
  {
    "id": "cmckgmb5b006zv2qbig2hc9x2",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicr0021v2oy6hmmcnsm",
    "createdAt": "2025-07-01T11:43:56.400Z"
  },
  {
    "id": "cmckgmb5f0071v2qb8a9tl1wo",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicu0022v2oymdyx7nzb",
    "createdAt": "2025-07-01T11:43:56.403Z"
  },
  {
    "id": "cmckgmb5j0073v2qb9hir19tq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglicx0023v2oyxxdlim93",
    "createdAt": "2025-07-01T11:43:56.408Z"
  },
  {
    "id": "cmckgmb5o0075v2qbvot26qvg",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglid00024v2oy0mwlw34i",
    "createdAt": "2025-07-01T11:43:56.412Z"
  },
  {
    "id": "cmckgmb5u0077v2qbk7ljoaqk",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglid40025v2oy45gjd85z",
    "createdAt": "2025-07-01T11:43:56.418Z"
  },
  {
    "id": "cmckgmb5y0079v2qbcwyqrlyr",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglid80026v2oywa7xgmd2",
    "createdAt": "2025-07-01T11:43:56.422Z"
  },
  {
    "id": "cmckgmb62007bv2qbis4q8eno",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidb0027v2oymv4y1089",
    "createdAt": "2025-07-01T11:43:56.426Z"
  },
  {
    "id": "cmckgmb66007dv2qbhmxhb85x",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglide0028v2oy1cquvpz2",
    "createdAt": "2025-07-01T11:43:56.430Z"
  },
  {
    "id": "cmckgmb6a007fv2qb4c7tvxbm",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidi0029v2oy45ah4rck",
    "createdAt": "2025-07-01T11:43:56.434Z"
  },
  {
    "id": "cmckgmb6d007hv2qbpmxjxthr",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidl002av2oy0aecagef",
    "createdAt": "2025-07-01T11:43:56.438Z"
  },
  {
    "id": "cmckgmb6h007jv2qbstv4aa4h",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidp002bv2oyr9y9in3k",
    "createdAt": "2025-07-01T11:43:56.442Z"
  },
  {
    "id": "cmckgmb6l007lv2qb7c89taep",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidt002cv2oy1fz2s8e1",
    "createdAt": "2025-07-01T11:43:56.446Z"
  },
  {
    "id": "cmckgmb6p007nv2qbq9evpfdp",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidw002dv2oy9y0vnv3z",
    "createdAt": "2025-07-01T11:43:56.450Z"
  },
  {
    "id": "cmckgmb6t007pv2qbvarstjih",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglidz002ev2oyzmo64qpt",
    "createdAt": "2025-07-01T11:43:56.453Z"
  },
  {
    "id": "cmckgmb6x007rv2qb264yrjta",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglie3002fv2oyupa5s521",
    "createdAt": "2025-07-01T11:43:56.457Z"
  },
  {
    "id": "cmckgmb71007tv2qbextp0z0p",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglie6002gv2oy79apj2gt",
    "createdAt": "2025-07-01T11:43:56.461Z"
  },
  {
    "id": "cmckgmb75007vv2qbgluueocg",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglie9002hv2oy3mo5k34d",
    "createdAt": "2025-07-01T11:43:56.465Z"
  },
  {
    "id": "cmckgmb79007xv2qbeoozqbq4",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglied002iv2oyvyv6xegu",
    "createdAt": "2025-07-01T11:43:56.469Z"
  },
  {
    "id": "cmckgmb7d007zv2qbtg7z2nma",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglieh002jv2oytacr2oev",
    "createdAt": "2025-07-01T11:43:56.473Z"
  },
  {
    "id": "cmckgmb7g0081v2qbcjstr8zp",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliek002kv2oynzle9hap",
    "createdAt": "2025-07-01T11:43:56.477Z"
  },
  {
    "id": "cmckgmb7l0083v2qb9wem26i1",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglien002lv2oyrrh41do1",
    "createdAt": "2025-07-01T11:43:56.482Z"
  },
  {
    "id": "cmckgmb7s0085v2qb1z7bwfk6",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglieq002mv2oy5ul34bi9",
    "createdAt": "2025-07-01T11:43:56.489Z"
  },
  {
    "id": "cmckgmb7w0087v2qbmip51zk6",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliet002nv2oyypp5k0u1",
    "createdAt": "2025-07-01T11:43:56.493Z"
  },
  {
    "id": "cmckgmb800089v2qblvi0uleb",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckgliex002ov2oy8quxopyk",
    "createdAt": "2025-07-01T11:43:56.497Z"
  },
  {
    "id": "cmckgmb85008bv2qbd0nczcd8",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglif0002pv2oyo9is7rvk",
    "createdAt": "2025-07-01T11:43:56.501Z"
  },
  {
    "id": "cmckgmb89008dv2qb6icp53ey",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglif3002qv2oy76dyb5kn",
    "createdAt": "2025-07-01T11:43:56.505Z"
  },
  {
    "id": "cmckgmb8c008fv2qbe33kyzov",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglif7002rv2oyyiuffxec",
    "createdAt": "2025-07-01T11:43:56.509Z"
  },
  {
    "id": "cmckgmb8g008hv2qbumpb0nmq",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglifb002sv2oyr4boidmv",
    "createdAt": "2025-07-01T11:43:56.513Z"
  },
  {
    "id": "cmckgmb8l008jv2qbzxirsurs",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglife002tv2oyhdx70b6d",
    "createdAt": "2025-07-01T11:43:56.517Z"
  },
  {
    "id": "cmckgmb8p008lv2qbv23pkpip",
    "role": "SUPER_ADMIN",
    "permissionId": "cmckglifi002uv2oybouy8wqb",
    "createdAt": "2025-07-01T11:43:56.521Z"
  },
  {
    "id": "cmckgmb8t008nv2qb8vserm1x",
    "role": "SUPER_ADMIN",
    "permissionId": "cmcfawne40000v255pay9ww3o",
    "createdAt": "2025-07-01T11:43:56.525Z"
  },
  {
    "id": "cmckgmb91008pv2qbcb52spw5",
    "role": "ADMIN",
    "permissionId": "cmckgli4n0000v2oy3h5myof4",
    "createdAt": "2025-07-01T11:43:56.534Z"
  },
  {
    "id": "cmckgmb96008rv2qbx21hxlnc",
    "role": "ADMIN",
    "permissionId": "cmckgli580001v2oytsoqhuew",
    "createdAt": "2025-07-01T11:43:56.539Z"
  },
  {
    "id": "cmckgmb9a008tv2qbe222mls3",
    "role": "ADMIN",
    "permissionId": "cmckgli5g0002v2oyl1w7k5ib",
    "createdAt": "2025-07-01T11:43:56.543Z"
  },
  {
    "id": "cmckgmb9f008vv2qbpuod6ke8",
    "role": "ADMIN",
    "permissionId": "cmckgli5l0003v2oylb5hb80z",
    "createdAt": "2025-07-01T11:43:56.547Z"
  },
  {
    "id": "cmckgmb9j008xv2qbh90hkd47",
    "role": "ADMIN",
    "permissionId": "cmckgli5p0004v2oyiscbypw9",
    "createdAt": "2025-07-01T11:43:56.551Z"
  },
  {
    "id": "cmckgmb9n008zv2qbxvspnhez",
    "role": "ADMIN",
    "permissionId": "cmckgli5t0005v2oyiz3glyo7",
    "createdAt": "2025-07-01T11:43:56.556Z"
  },
  {
    "id": "cmckgmb9s0091v2qbdusfkuv9",
    "role": "ADMIN",
    "permissionId": "cmckgli5w0006v2oy4vv56uuv",
    "createdAt": "2025-07-01T11:43:56.560Z"
  },
  {
    "id": "cmckgmb9w0093v2qb40cn4cau",
    "role": "ADMIN",
    "permissionId": "cmcfbja0k0000v2ykjqvwqeoc",
    "createdAt": "2025-07-01T11:43:56.565Z"
  },
  {
    "id": "cmckgmba10095v2qbxrjanthm",
    "role": "ADMIN",
    "permissionId": "cmcfbja0v0001v2ykl384bfgy",
    "createdAt": "2025-07-01T11:43:56.569Z"
  },
  {
    "id": "cmckgmba50097v2qb2q6hjq3i",
    "role": "ADMIN",
    "permissionId": "cmckgli680009v2oy5z509tsf",
    "createdAt": "2025-07-01T11:43:56.573Z"
  },
  {
    "id": "cmckgmba90099v2qbojn89l0e",
    "role": "ADMIN",
    "permissionId": "cmcfbja0z0002v2yk2vrns9sk",
    "createdAt": "2025-07-01T11:43:56.577Z"
  },
  {
    "id": "cmckgmbad009bv2qbggjzd6ab",
    "role": "ADMIN",
    "permissionId": "cmcfbja130003v2ykds9mtdml",
    "createdAt": "2025-07-01T11:43:56.582Z"
  },
  {
    "id": "cmckgmbai009dv2qbbiusv3jw",
    "role": "ADMIN",
    "permissionId": "cmckgli6i000cv2oy3e7gaq2i",
    "createdAt": "2025-07-01T11:43:56.587Z"
  },
  {
    "id": "cmckgmbar009fv2qbn4u4pgh4",
    "role": "ADMIN",
    "permissionId": "cmckgli6m000dv2oyjim8r5ak",
    "createdAt": "2025-07-01T11:43:56.595Z"
  },
  {
    "id": "cmckgmbaw009hv2qbxhmp0eqb",
    "role": "ADMIN",
    "permissionId": "cmckgli6q000ev2oy8uvntst9",
    "createdAt": "2025-07-01T11:43:56.601Z"
  },
  {
    "id": "cmckgmbb0009jv2qbcuvtjwzi",
    "role": "ADMIN",
    "permissionId": "cmckgli6u000fv2oyy8w19gu3",
    "createdAt": "2025-07-01T11:43:56.605Z"
  },
  {
    "id": "cmckgmbb4009lv2qbbflx50sw",
    "role": "ADMIN",
    "permissionId": "cmckgli6x000gv2oy7b5mdipm",
    "createdAt": "2025-07-01T11:43:56.609Z"
  },
  {
    "id": "cmckgmbb8009nv2qbweyu1cgv",
    "role": "ADMIN",
    "permissionId": "cmckgli70000hv2oyh0j463oe",
    "createdAt": "2025-07-01T11:43:56.613Z"
  },
  {
    "id": "cmckgmbbd009pv2qbs7pigto9",
    "role": "ADMIN",
    "permissionId": "cmckgli74000iv2oygsxtswe9",
    "createdAt": "2025-07-01T11:43:56.617Z"
  },
  {
    "id": "cmckgmbbh009rv2qb5x1zupzb",
    "role": "ADMIN",
    "permissionId": "cmckgli78000jv2oybhjrpxww",
    "createdAt": "2025-07-01T11:43:56.621Z"
  },
  {
    "id": "cmckgmbbl009tv2qb3y5m534o",
    "role": "ADMIN",
    "permissionId": "cmckgli7b000kv2oyojx7lu1d",
    "createdAt": "2025-07-01T11:43:56.625Z"
  },
  {
    "id": "cmckgmbbp009vv2qb65rdxjhd",
    "role": "ADMIN",
    "permissionId": "cmckgli7e000lv2oyur9ys6ws",
    "createdAt": "2025-07-01T11:43:56.629Z"
  },
  {
    "id": "cmckgmbbt009xv2qb6a7orgti",
    "role": "ADMIN",
    "permissionId": "cmckgli7i000mv2oyt7dqr6zr",
    "createdAt": "2025-07-01T11:43:56.633Z"
  },
  {
    "id": "cmckgmbbx009zv2qb64mesbvy",
    "role": "ADMIN",
    "permissionId": "cmckgli7m000nv2oydzmszwae",
    "createdAt": "2025-07-01T11:43:56.637Z"
  },
  {
    "id": "cmckgmbc200a1v2qbwmtvl71v",
    "role": "ADMIN",
    "permissionId": "cmckgli7p000ov2oyr9da4x2o",
    "createdAt": "2025-07-01T11:43:56.642Z"
  },
  {
    "id": "cmckgmbc600a3v2qb759nyfvc",
    "role": "ADMIN",
    "permissionId": "cmckgli7s000pv2oy32r20ply",
    "createdAt": "2025-07-01T11:43:56.647Z"
  },
  {
    "id": "cmckgmbca00a5v2qb1z0nljqw",
    "role": "ADMIN",
    "permissionId": "cmckgli7w000qv2oyjvun0fhw",
    "createdAt": "2025-07-01T11:43:56.650Z"
  },
  {
    "id": "cmckgmbce00a7v2qb3v6y5bst",
    "role": "ADMIN",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:56.654Z"
  },
  {
    "id": "cmckgmbci00a9v2qb6ujhkzu2",
    "role": "ADMIN",
    "permissionId": "cmckgli85000sv2oycd6qrm0r",
    "createdAt": "2025-07-01T11:43:56.659Z"
  },
  {
    "id": "cmckgmbcm00abv2qb9fk51ltd",
    "role": "ADMIN",
    "permissionId": "cmckgli8a000tv2oy9vqmqe0z",
    "createdAt": "2025-07-01T11:43:56.663Z"
  },
  {
    "id": "cmckgmbcr00adv2qb68b4t1xc",
    "role": "ADMIN",
    "permissionId": "cmckgli8d000uv2oy3r0340hp",
    "createdAt": "2025-07-01T11:43:56.667Z"
  },
  {
    "id": "cmckgmbcu00afv2qbcob2m4gn",
    "role": "ADMIN",
    "permissionId": "cmckgli8h000vv2oyvuaw7oqd",
    "createdAt": "2025-07-01T11:43:56.671Z"
  },
  {
    "id": "cmckgmbcy00ahv2qbm0ebx1z2",
    "role": "ADMIN",
    "permissionId": "cmckgli8l000wv2oya77rfbdv",
    "createdAt": "2025-07-01T11:43:56.674Z"
  },
  {
    "id": "cmckgmbd200ajv2qb01myydm0",
    "role": "ADMIN",
    "permissionId": "cmckgli8p000xv2oyvrlbwthg",
    "createdAt": "2025-07-01T11:43:56.679Z"
  },
  {
    "id": "cmckgmbd600alv2qb1smn5lz1",
    "role": "ADMIN",
    "permissionId": "cmckgli8t000yv2oy9elj3pyw",
    "createdAt": "2025-07-01T11:43:56.683Z"
  },
  {
    "id": "cmckgmbda00anv2qbc3uj9efe",
    "role": "ADMIN",
    "permissionId": "cmckgli8x000zv2oyh2h7o06u",
    "createdAt": "2025-07-01T11:43:56.687Z"
  },
  {
    "id": "cmckgmbdf00apv2qb2wcvh5wq",
    "role": "ADMIN",
    "permissionId": "cmckgli900010v2oyph6fzi1q",
    "createdAt": "2025-07-01T11:43:56.691Z"
  },
  {
    "id": "cmckgmbdi00arv2qbtlt8ajka",
    "role": "ADMIN",
    "permissionId": "cmckgli940011v2oyxk9zruje",
    "createdAt": "2025-07-01T11:43:56.695Z"
  },
  {
    "id": "cmckgmbdm00atv2qbvn5szlmk",
    "role": "ADMIN",
    "permissionId": "cmckgli970012v2oyxp6wnydl",
    "createdAt": "2025-07-01T11:43:56.699Z"
  },
  {
    "id": "cmckgmbdr00avv2qbiysh0dfu",
    "role": "ADMIN",
    "permissionId": "cmckgli9b0013v2oygc9ihyyl",
    "createdAt": "2025-07-01T11:43:56.703Z"
  },
  {
    "id": "cmckgmbdv00axv2qb0xihnybg",
    "role": "ADMIN",
    "permissionId": "cmckgli9f0014v2oyuve5mo78",
    "createdAt": "2025-07-01T11:43:56.707Z"
  },
  {
    "id": "cmckgmbdz00azv2qbhvhfpwo3",
    "role": "ADMIN",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:56.711Z"
  },
  {
    "id": "cmckgmbe300b1v2qbd75j4jq1",
    "role": "ADMIN",
    "permissionId": "cmckgli9m0016v2oyupyaqbif",
    "createdAt": "2025-07-01T11:43:56.715Z"
  },
  {
    "id": "cmckgmbe700b3v2qbnv9rdukj",
    "role": "ADMIN",
    "permissionId": "cmckgli9q0017v2oy2w8toy5y",
    "createdAt": "2025-07-01T11:43:56.719Z"
  },
  {
    "id": "cmckgmbeb00b5v2qbtqicmapy",
    "role": "ADMIN",
    "permissionId": "cmckgli9t0018v2oyyts54bgf",
    "createdAt": "2025-07-01T11:43:56.723Z"
  },
  {
    "id": "cmckgmbef00b7v2qbbxqiloyv",
    "role": "ADMIN",
    "permissionId": "cmckgli9x0019v2oy9k5k3o6w",
    "createdAt": "2025-07-01T11:43:56.727Z"
  },
  {
    "id": "cmckgmbek00b9v2qbr2iao635",
    "role": "ADMIN",
    "permissionId": "cmckglia0001av2oyt3ej464w",
    "createdAt": "2025-07-01T11:43:56.732Z"
  },
  {
    "id": "cmckgmbeo00bbv2qbu5ziony5",
    "role": "ADMIN",
    "permissionId": "cmckglia3001bv2oyihiacgxm",
    "createdAt": "2025-07-01T11:43:56.737Z"
  },
  {
    "id": "cmckgmbes00bdv2qbaqo6sb7b",
    "role": "ADMIN",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:56.741Z"
  },
  {
    "id": "cmckgmbew00bfv2qbtn1px10d",
    "role": "ADMIN",
    "permissionId": "cmckgliab001dv2oyvncxrqqf",
    "createdAt": "2025-07-01T11:43:56.745Z"
  },
  {
    "id": "cmckgmbf000bhv2qbpcrs6pd2",
    "role": "ADMIN",
    "permissionId": "cmckgliaf001ev2oyscab7rrb",
    "createdAt": "2025-07-01T11:43:56.749Z"
  },
  {
    "id": "cmckgmbf400bjv2qb6jmjlc3m",
    "role": "ADMIN",
    "permissionId": "cmckgliaj001fv2oyavvsbqsk",
    "createdAt": "2025-07-01T11:43:56.753Z"
  },
  {
    "id": "cmckgmbf900blv2qb612do7qr",
    "role": "ADMIN",
    "permissionId": "cmckglian001gv2oy5gbu21ja",
    "createdAt": "2025-07-01T11:43:56.757Z"
  },
  {
    "id": "cmckgmbfd00bnv2qbvcqfm404",
    "role": "ADMIN",
    "permissionId": "cmckgliaq001hv2oyn1kmeiik",
    "createdAt": "2025-07-01T11:43:56.761Z"
  },
  {
    "id": "cmckgmbfh00bpv2qbpdcrecjj",
    "role": "ADMIN",
    "permissionId": "cmckgliau001iv2oyf03bgqgy",
    "createdAt": "2025-07-01T11:43:56.766Z"
  },
  {
    "id": "cmckgmbfm00brv2qby9hbj9p0",
    "role": "ADMIN",
    "permissionId": "cmckgliax001jv2oymk0zjjzq",
    "createdAt": "2025-07-01T11:43:56.770Z"
  },
  {
    "id": "cmckgmbfq00btv2qbhrhvdx6x",
    "role": "ADMIN",
    "permissionId": "cmcd9idq60001v267in77l6m7",
    "createdAt": "2025-07-01T11:43:56.775Z"
  },
  {
    "id": "cmckgmbfv00bvv2qblgs2d5q3",
    "role": "ADMIN",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:56.779Z"
  },
  {
    "id": "cmckgmbfz00bxv2qb8kgxtb61",
    "role": "ADMIN",
    "permissionId": "cmcd9idqf0002v2679qh2mnwp",
    "createdAt": "2025-07-01T11:43:56.783Z"
  },
  {
    "id": "cmckgmbg300bzv2qbjrlr9zcn",
    "role": "ADMIN",
    "permissionId": "cmcd9idr60003v267d00caka9",
    "createdAt": "2025-07-01T11:43:56.788Z"
  },
  {
    "id": "cmckgmbg700c1v2qb4hsqnonr",
    "role": "ADMIN",
    "permissionId": "cmckglibf001ov2oym62e17t5",
    "createdAt": "2025-07-01T11:43:56.791Z"
  },
  {
    "id": "cmckgmbgb00c3v2qbto0nxn4x",
    "role": "ADMIN",
    "permissionId": "cmckglibi001pv2oyad3w0gtl",
    "createdAt": "2025-07-01T11:43:56.796Z"
  },
  {
    "id": "cmckgmbgf00c5v2qbg5vf8i8k",
    "role": "ADMIN",
    "permissionId": "cmckglibm001qv2oyek8kgfa5",
    "createdAt": "2025-07-01T11:43:56.800Z"
  },
  {
    "id": "cmckgmbgj00c7v2qb5dl5scyz",
    "role": "ADMIN",
    "permissionId": "cmckglibq001rv2oy8objq60z",
    "createdAt": "2025-07-01T11:43:56.804Z"
  },
  {
    "id": "cmckgmbgo00c9v2qb0yto3z7b",
    "role": "ADMIN",
    "permissionId": "cmckglibt001sv2oyezjiex8j",
    "createdAt": "2025-07-01T11:43:56.808Z"
  },
  {
    "id": "cmckgmbgs00cbv2qbba1z07xy",
    "role": "ADMIN",
    "permissionId": "cmckglibx001tv2oyob2jco5d",
    "createdAt": "2025-07-01T11:43:56.812Z"
  },
  {
    "id": "cmckgmbgw00cdv2qb17s7h2q4",
    "role": "ADMIN",
    "permissionId": "cmckglic2001uv2oy8alxvh42",
    "createdAt": "2025-07-01T11:43:56.816Z"
  },
  {
    "id": "cmckgmbh000cfv2qbb594ypu9",
    "role": "ADMIN",
    "permissionId": "cmckglic6001vv2oyu569z5mr",
    "createdAt": "2025-07-01T11:43:56.820Z"
  },
  {
    "id": "cmckgmbh300chv2qbqe2x4dzl",
    "role": "ADMIN",
    "permissionId": "cmckglica001wv2oys7xtgbd2",
    "createdAt": "2025-07-01T11:43:56.824Z"
  },
  {
    "id": "cmckgmbh700cjv2qbdwp8i5vf",
    "role": "ADMIN",
    "permissionId": "cmckglicd001xv2oy70grl1st",
    "createdAt": "2025-07-01T11:43:56.828Z"
  },
  {
    "id": "cmckgmbhg00clv2qbvgic6r40",
    "role": "ADMIN",
    "permissionId": "cmckglicg001yv2oyv0ez23te",
    "createdAt": "2025-07-01T11:43:56.834Z"
  },
  {
    "id": "cmckgmbhl00cnv2qbj91w1n2e",
    "role": "ADMIN",
    "permissionId": "cmckglick001zv2oypd05x3gg",
    "createdAt": "2025-07-01T11:43:56.841Z"
  },
  {
    "id": "cmckgmbhp00cpv2qbvvlchbmh",
    "role": "ADMIN",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:56.845Z"
  },
  {
    "id": "cmckgmbht00crv2qb20zcyoat",
    "role": "ADMIN",
    "permissionId": "cmckglicr0021v2oy6hmmcnsm",
    "createdAt": "2025-07-01T11:43:56.849Z"
  },
  {
    "id": "cmckgmbhx00ctv2qbtuwwlzum",
    "role": "ADMIN",
    "permissionId": "cmckglicu0022v2oymdyx7nzb",
    "createdAt": "2025-07-01T11:43:56.853Z"
  },
  {
    "id": "cmckgmbi000cvv2qbp2wqwz5d",
    "role": "ADMIN",
    "permissionId": "cmckglicx0023v2oyxxdlim93",
    "createdAt": "2025-07-01T11:43:56.857Z"
  },
  {
    "id": "cmckgmbi400cxv2qbim9rscfc",
    "role": "ADMIN",
    "permissionId": "cmckglid00024v2oy0mwlw34i",
    "createdAt": "2025-07-01T11:43:56.861Z"
  },
  {
    "id": "cmckgmbi800czv2qb9c1u9j4v",
    "role": "ADMIN",
    "permissionId": "cmckglid40025v2oy45gjd85z",
    "createdAt": "2025-07-01T11:43:56.865Z"
  },
  {
    "id": "cmckgmbid00d1v2qbzavilunw",
    "role": "ADMIN",
    "permissionId": "cmckglid80026v2oywa7xgmd2",
    "createdAt": "2025-07-01T11:43:56.869Z"
  },
  {
    "id": "cmckgmbih00d3v2qbwjrnhchr",
    "role": "ADMIN",
    "permissionId": "cmckglidb0027v2oymv4y1089",
    "createdAt": "2025-07-01T11:43:56.873Z"
  },
  {
    "id": "cmckgmbil00d5v2qbnqhla3xi",
    "role": "ADMIN",
    "permissionId": "cmckglide0028v2oy1cquvpz2",
    "createdAt": "2025-07-01T11:43:56.877Z"
  },
  {
    "id": "cmckgmbip00d7v2qbsikq0e92",
    "role": "ADMIN",
    "permissionId": "cmckglidi0029v2oy45ah4rck",
    "createdAt": "2025-07-01T11:43:56.881Z"
  },
  {
    "id": "cmckgmbiv00d9v2qb8xz9rkwy",
    "role": "ADMIN",
    "permissionId": "cmckglidl002av2oy0aecagef",
    "createdAt": "2025-07-01T11:43:56.888Z"
  },
  {
    "id": "cmckgmbj000dbv2qbapqq9bzh",
    "role": "ADMIN",
    "permissionId": "cmckglidp002bv2oyr9y9in3k",
    "createdAt": "2025-07-01T11:43:56.892Z"
  },
  {
    "id": "cmckgmbj400ddv2qbntw51zu1",
    "role": "ADMIN",
    "permissionId": "cmckglidt002cv2oy1fz2s8e1",
    "createdAt": "2025-07-01T11:43:56.897Z"
  },
  {
    "id": "cmckgmbj900dfv2qb51nz6ufq",
    "role": "ADMIN",
    "permissionId": "cmckglidw002dv2oy9y0vnv3z",
    "createdAt": "2025-07-01T11:43:56.901Z"
  },
  {
    "id": "cmckgmbje00dhv2qb3pqdeiy5",
    "role": "ADMIN",
    "permissionId": "cmckglidz002ev2oyzmo64qpt",
    "createdAt": "2025-07-01T11:43:56.906Z"
  },
  {
    "id": "cmckgmbji00djv2qbs4argvij",
    "role": "ADMIN",
    "permissionId": "cmckglie3002fv2oyupa5s521",
    "createdAt": "2025-07-01T11:43:56.911Z"
  },
  {
    "id": "cmckgmbjm00dlv2qb15i3tfd4",
    "role": "ADMIN",
    "permissionId": "cmckglie6002gv2oy79apj2gt",
    "createdAt": "2025-07-01T11:43:56.915Z"
  },
  {
    "id": "cmckgmbjr00dnv2qb6tknii3n",
    "role": "ADMIN",
    "permissionId": "cmckglie9002hv2oy3mo5k34d",
    "createdAt": "2025-07-01T11:43:56.919Z"
  },
  {
    "id": "cmckgmbju00dpv2qb1t0wbwhq",
    "role": "ADMIN",
    "permissionId": "cmckglied002iv2oyvyv6xegu",
    "createdAt": "2025-07-01T11:43:56.923Z"
  },
  {
    "id": "cmckgmbjy00drv2qb5gjke42o",
    "role": "ADMIN",
    "permissionId": "cmckglieh002jv2oytacr2oev",
    "createdAt": "2025-07-01T11:43:56.927Z"
  },
  {
    "id": "cmckgmbk300dtv2qb1zyfsbvv",
    "role": "ADMIN",
    "permissionId": "cmckgliet002nv2oyypp5k0u1",
    "createdAt": "2025-07-01T11:43:56.931Z"
  },
  {
    "id": "cmckgmbk800dvv2qbb2tpsiff",
    "role": "ADMIN",
    "permissionId": "cmckglif0002pv2oyo9is7rvk",
    "createdAt": "2025-07-01T11:43:56.936Z"
  },
  {
    "id": "cmckgmbkc00dxv2qbb3b693qv",
    "role": "ADMIN",
    "permissionId": "cmckglif3002qv2oy76dyb5kn",
    "createdAt": "2025-07-01T11:43:56.941Z"
  },
  {
    "id": "cmckgmbkh00dzv2qbgk77wb1w",
    "role": "ADMIN",
    "permissionId": "cmckglif7002rv2oyyiuffxec",
    "createdAt": "2025-07-01T11:43:56.945Z"
  },
  {
    "id": "cmckgmbkl00e1v2qbbjj2f7st",
    "role": "ADMIN",
    "permissionId": "cmckglifb002sv2oyr4boidmv",
    "createdAt": "2025-07-01T11:43:56.950Z"
  },
  {
    "id": "cmckgmbkq00e3v2qbhmeyhxbs",
    "role": "ADMIN",
    "permissionId": "cmckglife002tv2oyhdx70b6d",
    "createdAt": "2025-07-01T11:43:56.954Z"
  },
  {
    "id": "cmckgmbkt00e5v2qb7u23a3v3",
    "role": "ADMIN",
    "permissionId": "cmckglifi002uv2oybouy8wqb",
    "createdAt": "2025-07-01T11:43:56.958Z"
  },
  {
    "id": "cmckgmbkx00e7v2qbmoz9cazo",
    "role": "ADMIN",
    "permissionId": "cmcfawne40000v255pay9ww3o",
    "createdAt": "2025-07-01T11:43:56.962Z"
  },
  {
    "id": "cmckgmbl500e9v2qb6bjzfaeq",
    "role": "MANAGER",
    "permissionId": "cmcfbja0k0000v2ykjqvwqeoc",
    "createdAt": "2025-07-01T11:43:56.970Z"
  },
  {
    "id": "cmckgmbl900ebv2qbhiycb209",
    "role": "MANAGER",
    "permissionId": "cmcfbja0v0001v2ykl384bfgy",
    "createdAt": "2025-07-01T11:43:56.973Z"
  },
  {
    "id": "cmckgmbld00edv2qb9150gia4",
    "role": "MANAGER",
    "permissionId": "cmcfbja0z0002v2yk2vrns9sk",
    "createdAt": "2025-07-01T11:43:56.977Z"
  },
  {
    "id": "cmckgmblh00efv2qb6p8zcif0",
    "role": "MANAGER",
    "permissionId": "cmcfbja130003v2ykds9mtdml",
    "createdAt": "2025-07-01T11:43:56.982Z"
  },
  {
    "id": "cmckgmbll00ehv2qb7kzyl93n",
    "role": "MANAGER",
    "permissionId": "cmckgli6i000cv2oy3e7gaq2i",
    "createdAt": "2025-07-01T11:43:56.986Z"
  },
  {
    "id": "cmckgmblq00ejv2qbg2qviubo",
    "role": "MANAGER",
    "permissionId": "cmckgli6m000dv2oyjim8r5ak",
    "createdAt": "2025-07-01T11:43:56.990Z"
  },
  {
    "id": "cmckgmblt00elv2qb6a0530fy",
    "role": "MANAGER",
    "permissionId": "cmckgli6q000ev2oy8uvntst9",
    "createdAt": "2025-07-01T11:43:56.994Z"
  },
  {
    "id": "cmckgmblx00env2qbg6j2ptbm",
    "role": "MANAGER",
    "permissionId": "cmckgli6x000gv2oy7b5mdipm",
    "createdAt": "2025-07-01T11:43:56.998Z"
  },
  {
    "id": "cmckgmbm100epv2qbsvfyc0kj",
    "role": "MANAGER",
    "permissionId": "cmckgli74000iv2oygsxtswe9",
    "createdAt": "2025-07-01T11:43:57.002Z"
  },
  {
    "id": "cmckgmbm500erv2qbz9cmwrqc",
    "role": "MANAGER",
    "permissionId": "cmckgli78000jv2oybhjrpxww",
    "createdAt": "2025-07-01T11:43:57.006Z"
  },
  {
    "id": "cmckgmbm900etv2qbpkas25d8",
    "role": "MANAGER",
    "permissionId": "cmckgli7b000kv2oyojx7lu1d",
    "createdAt": "2025-07-01T11:43:57.010Z"
  },
  {
    "id": "cmckgmbmd00evv2qbrftyezoa",
    "role": "MANAGER",
    "permissionId": "cmckgli7e000lv2oyur9ys6ws",
    "createdAt": "2025-07-01T11:43:57.014Z"
  },
  {
    "id": "cmckgmbmi00exv2qb0cz9x1rc",
    "role": "MANAGER",
    "permissionId": "cmckgli7i000mv2oyt7dqr6zr",
    "createdAt": "2025-07-01T11:43:57.018Z"
  },
  {
    "id": "cmckgmbmn00ezv2qbifr42av1",
    "role": "MANAGER",
    "permissionId": "cmckgli7p000ov2oyr9da4x2o",
    "createdAt": "2025-07-01T11:43:57.023Z"
  },
  {
    "id": "cmckgmbmq00f1v2qbel6w94zf",
    "role": "MANAGER",
    "permissionId": "cmckgli7s000pv2oy32r20ply",
    "createdAt": "2025-07-01T11:43:57.027Z"
  },
  {
    "id": "cmckgmbmv00f3v2qb2t13d68w",
    "role": "MANAGER",
    "permissionId": "cmckgli7w000qv2oyjvun0fhw",
    "createdAt": "2025-07-01T11:43:57.031Z"
  },
  {
    "id": "cmckgmbmz00f5v2qbmb8sx7ac",
    "role": "MANAGER",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:57.035Z"
  },
  {
    "id": "cmckgmbn300f7v2qb39v0uvzl",
    "role": "MANAGER",
    "permissionId": "cmckgli85000sv2oycd6qrm0r",
    "createdAt": "2025-07-01T11:43:57.039Z"
  },
  {
    "id": "cmckgmbn600f9v2qbw0ix3xhu",
    "role": "MANAGER",
    "permissionId": "cmckgli8d000uv2oy3r0340hp",
    "createdAt": "2025-07-01T11:43:57.043Z"
  },
  {
    "id": "cmckgmbna00fbv2qb9qtf8m11",
    "role": "MANAGER",
    "permissionId": "cmckgli8h000vv2oyvuaw7oqd",
    "createdAt": "2025-07-01T11:43:57.047Z"
  },
  {
    "id": "cmckgmbne00fdv2qbes5lxnn0",
    "role": "MANAGER",
    "permissionId": "cmckgli8l000wv2oya77rfbdv",
    "createdAt": "2025-07-01T11:43:57.050Z"
  },
  {
    "id": "cmckgmbni00ffv2qbhgs17isq",
    "role": "MANAGER",
    "permissionId": "cmckgli8p000xv2oyvrlbwthg",
    "createdAt": "2025-07-01T11:43:57.054Z"
  },
  {
    "id": "cmckgmbnm00fhv2qbs654q2tl",
    "role": "MANAGER",
    "permissionId": "cmckgli8t000yv2oy9elj3pyw",
    "createdAt": "2025-07-01T11:43:57.058Z"
  },
  {
    "id": "cmckgmbnp00fjv2qbwakc7dyn",
    "role": "MANAGER",
    "permissionId": "cmckgli900010v2oyph6fzi1q",
    "createdAt": "2025-07-01T11:43:57.062Z"
  },
  {
    "id": "cmckgmbnt00flv2qbybfpiaj2",
    "role": "MANAGER",
    "permissionId": "cmckgli940011v2oyxk9zruje",
    "createdAt": "2025-07-01T11:43:57.066Z"
  },
  {
    "id": "cmckgmbny00fnv2qbyobeh0tt",
    "role": "MANAGER",
    "permissionId": "cmckgli970012v2oyxp6wnydl",
    "createdAt": "2025-07-01T11:43:57.070Z"
  },
  {
    "id": "cmckgmbo300fpv2qbooqfqznk",
    "role": "MANAGER",
    "permissionId": "cmckgli9b0013v2oygc9ihyyl",
    "createdAt": "2025-07-01T11:43:57.075Z"
  },
  {
    "id": "cmckgmbo800frv2qbj9w652gz",
    "role": "MANAGER",
    "permissionId": "cmckgli9f0014v2oyuve5mo78",
    "createdAt": "2025-07-01T11:43:57.080Z"
  },
  {
    "id": "cmckgmboc00ftv2qbkmsrksuo",
    "role": "MANAGER",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:57.084Z"
  },
  {
    "id": "cmckgmbog00fvv2qb9kl75qnv",
    "role": "MANAGER",
    "permissionId": "cmckgli9m0016v2oyupyaqbif",
    "createdAt": "2025-07-01T11:43:57.088Z"
  },
  {
    "id": "cmckgmboj00fxv2qbzv2ivpgw",
    "role": "MANAGER",
    "permissionId": "cmckgli9t0018v2oyyts54bgf",
    "createdAt": "2025-07-01T11:43:57.092Z"
  },
  {
    "id": "cmckgmboo00fzv2qbitdxbnw5",
    "role": "MANAGER",
    "permissionId": "cmckgli9x0019v2oy9k5k3o6w",
    "createdAt": "2025-07-01T11:43:57.096Z"
  },
  {
    "id": "cmckgmbos00g1v2qb6wf169yf",
    "role": "MANAGER",
    "permissionId": "cmckglia0001av2oyt3ej464w",
    "createdAt": "2025-07-01T11:43:57.101Z"
  },
  {
    "id": "cmckgmbow00g3v2qbwv81euyl",
    "role": "MANAGER",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:57.105Z"
  },
  {
    "id": "cmckgmbp100g5v2qbs44wp8zg",
    "role": "MANAGER",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:57.109Z"
  },
  {
    "id": "cmckgmbp400g7v2qbfh6v2k05",
    "role": "MANAGER",
    "permissionId": "cmcd9idqf0002v2679qh2mnwp",
    "createdAt": "2025-07-01T11:43:57.113Z"
  },
  {
    "id": "cmckgmbp900g9v2qb9owfqzxx",
    "role": "MANAGER",
    "permissionId": "cmckglibq001rv2oy8objq60z",
    "createdAt": "2025-07-01T11:43:57.117Z"
  },
  {
    "id": "cmckgmbpd00gbv2qb1be7v1fr",
    "role": "MANAGER",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:57.121Z"
  },
  {
    "id": "cmckgmbpi00gdv2qbktc71h8i",
    "role": "MANAGER",
    "permissionId": "cmckglid40025v2oy45gjd85z",
    "createdAt": "2025-07-01T11:43:57.126Z"
  },
  {
    "id": "cmckgmbpm00gfv2qb57ay3mjk",
    "role": "MANAGER",
    "permissionId": "cmckglidb0027v2oymv4y1089",
    "createdAt": "2025-07-01T11:43:57.131Z"
  },
  {
    "id": "cmckgmbpq00ghv2qbrk7c9gfx",
    "role": "MANAGER",
    "permissionId": "cmckglidp002bv2oyr9y9in3k",
    "createdAt": "2025-07-01T11:43:57.134Z"
  },
  {
    "id": "cmckgmbpu00gjv2qb0xsb43sl",
    "role": "MANAGER",
    "permissionId": "cmckglif0002pv2oyo9is7rvk",
    "createdAt": "2025-07-01T11:43:57.139Z"
  },
  {
    "id": "cmckgmbpy00glv2qbc1bdbxgm",
    "role": "MANAGER",
    "permissionId": "cmckglifb002sv2oyr4boidmv",
    "createdAt": "2025-07-01T11:43:57.142Z"
  },
  {
    "id": "cmckgmbq700gnv2qbyjpqxg7b",
    "role": "MANAGER",
    "permissionId": "cmckglife002tv2oyhdx70b6d",
    "createdAt": "2025-07-01T11:43:57.152Z"
  },
  {
    "id": "cmckgmbqh00gpv2qbtwwggk5u",
    "role": "SALES_REP",
    "permissionId": "cmcfbja0k0000v2ykjqvwqeoc",
    "createdAt": "2025-07-01T11:43:57.162Z"
  },
  {
    "id": "cmckgmbqn00grv2qbgmz9znqh",
    "role": "SALES_REP",
    "permissionId": "cmckgli6i000cv2oy3e7gaq2i",
    "createdAt": "2025-07-01T11:43:57.168Z"
  },
  {
    "id": "cmckgmbqt00gtv2qbtqfnveuv",
    "role": "SALES_REP",
    "permissionId": "cmckgli6m000dv2oyjim8r5ak",
    "createdAt": "2025-07-01T11:43:57.173Z"
  },
  {
    "id": "cmckgmbqz00gvv2qblp0pbntc",
    "role": "SALES_REP",
    "permissionId": "cmckgli6q000ev2oy8uvntst9",
    "createdAt": "2025-07-01T11:43:57.179Z"
  },
  {
    "id": "cmckgmbr500gxv2qbxoyajiae",
    "role": "SALES_REP",
    "permissionId": "cmckgli7b000kv2oyojx7lu1d",
    "createdAt": "2025-07-01T11:43:57.185Z"
  },
  {
    "id": "cmckgmbra00gzv2qbtodjypzh",
    "role": "SALES_REP",
    "permissionId": "cmckgli7e000lv2oyur9ys6ws",
    "createdAt": "2025-07-01T11:43:57.190Z"
  },
  {
    "id": "cmckgmbrh00h1v2qb0fa5u2mv",
    "role": "SALES_REP",
    "permissionId": "cmckgli7i000mv2oyt7dqr6zr",
    "createdAt": "2025-07-01T11:43:57.197Z"
  },
  {
    "id": "cmckgmbrm00h3v2qbh5ykezhj",
    "role": "SALES_REP",
    "permissionId": "cmckgli7p000ov2oyr9da4x2o",
    "createdAt": "2025-07-01T11:43:57.202Z"
  },
  {
    "id": "cmckgmbrp00h5v2qb1n7ii7ii",
    "role": "SALES_REP",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:57.206Z"
  },
  {
    "id": "cmckgmbrt00h7v2qbfru07suc",
    "role": "SALES_REP",
    "permissionId": "cmckgli85000sv2oycd6qrm0r",
    "createdAt": "2025-07-01T11:43:57.210Z"
  },
  {
    "id": "cmckgmbrx00h9v2qb4s7a4gkc",
    "role": "SALES_REP",
    "permissionId": "cmckgli8l000wv2oya77rfbdv",
    "createdAt": "2025-07-01T11:43:57.214Z"
  },
  {
    "id": "cmckgmbs100hbv2qb4cfokzhl",
    "role": "SALES_REP",
    "permissionId": "cmckgli8p000xv2oyvrlbwthg",
    "createdAt": "2025-07-01T11:43:57.218Z"
  },
  {
    "id": "cmckgmbs500hdv2qbncwrbx7k",
    "role": "SALES_REP",
    "permissionId": "cmckgli8t000yv2oy9elj3pyw",
    "createdAt": "2025-07-01T11:43:57.222Z"
  },
  {
    "id": "cmckgmbs900hfv2qbhgw9rto9",
    "role": "SALES_REP",
    "permissionId": "cmckgli940011v2oyxk9zruje",
    "createdAt": "2025-07-01T11:43:57.226Z"
  },
  {
    "id": "cmckgmbsd00hhv2qbndpoj54q",
    "role": "SALES_REP",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:57.230Z"
  },
  {
    "id": "cmckgmbsi00hjv2qbxpkckln7",
    "role": "SALES_REP",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:57.234Z"
  },
  {
    "id": "cmckgmbsm00hlv2qbw9qnfgbv",
    "role": "SALES_REP",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:57.238Z"
  },
  {
    "id": "cmckgmbsp00hnv2qbuyzo9jmk",
    "role": "SALES_REP",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:57.242Z"
  },
  {
    "id": "cmckgmbsu00hpv2qbldua37ei",
    "role": "SALES_REP",
    "permissionId": "cmckglif0002pv2oyo9is7rvk",
    "createdAt": "2025-07-01T11:43:57.246Z"
  },
  {
    "id": "cmckgmbt200hrv2qbq0ql07zc",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglibt001sv2oyezjiex8j",
    "createdAt": "2025-07-01T11:43:57.255Z"
  },
  {
    "id": "cmckgmbt600htv2qbnueq8a3v",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglibx001tv2oyob2jco5d",
    "createdAt": "2025-07-01T11:43:57.259Z"
  },
  {
    "id": "cmckgmbta00hvv2qbtr0uankq",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglic2001uv2oy8alxvh42",
    "createdAt": "2025-07-01T11:43:57.263Z"
  },
  {
    "id": "cmckgmbte00hxv2qbkh87ygx5",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglic6001vv2oyu569z5mr",
    "createdAt": "2025-07-01T11:43:57.266Z"
  },
  {
    "id": "cmckgmbti00hzv2qbeh85dpby",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglica001wv2oys7xtgbd2",
    "createdAt": "2025-07-01T11:43:57.271Z"
  },
  {
    "id": "cmckgmbtm00i1v2qb9v3juxen",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglicd001xv2oy70grl1st",
    "createdAt": "2025-07-01T11:43:57.275Z"
  },
  {
    "id": "cmckgmbtr00i3v2qb8j6ip1en",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglicg001yv2oyv0ez23te",
    "createdAt": "2025-07-01T11:43:57.279Z"
  },
  {
    "id": "cmckgmbtx00i5v2qbo2a8fs4s",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglick001zv2oypd05x3gg",
    "createdAt": "2025-07-01T11:43:57.285Z"
  },
  {
    "id": "cmckgmbu100i7v2qbzgkgpocf",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:57.289Z"
  },
  {
    "id": "cmckgmbu500i9v2qbp9mmhx4y",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglicr0021v2oy6hmmcnsm",
    "createdAt": "2025-07-01T11:43:57.293Z"
  },
  {
    "id": "cmckgmbu900ibv2qbn7xqwyyl",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglicx0023v2oyxxdlim93",
    "createdAt": "2025-07-01T11:43:57.297Z"
  },
  {
    "id": "cmckgmbud00idv2qbylabb901",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglid00024v2oy0mwlw34i",
    "createdAt": "2025-07-01T11:43:57.301Z"
  },
  {
    "id": "cmckgmbug00ifv2qb6h3wqxf1",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglid40025v2oy45gjd85z",
    "createdAt": "2025-07-01T11:43:57.305Z"
  },
  {
    "id": "cmckgmbuk00ihv2qbzgyzh242",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglid80026v2oywa7xgmd2",
    "createdAt": "2025-07-01T11:43:57.309Z"
  },
  {
    "id": "cmckgmbup00ijv2qb4ug44hm7",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglidb0027v2oymv4y1089",
    "createdAt": "2025-07-01T11:43:57.313Z"
  },
  {
    "id": "cmckgmbuu00ilv2qbia6eypj1",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglide0028v2oy1cquvpz2",
    "createdAt": "2025-07-01T11:43:57.319Z"
  },
  {
    "id": "cmckgmbuy00inv2qbao0qw0tm",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglidl002av2oy0aecagef",
    "createdAt": "2025-07-01T11:43:57.323Z"
  },
  {
    "id": "cmckgmbv200ipv2qb2xxk8rdg",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglidp002bv2oyr9y9in3k",
    "createdAt": "2025-07-01T11:43:57.327Z"
  },
  {
    "id": "cmckgmbv700irv2qbyz3hwuqt",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglidw002dv2oy9y0vnv3z",
    "createdAt": "2025-07-01T11:43:57.331Z"
  },
  {
    "id": "cmckgmbvd00itv2qbx3oka8a1",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglied002iv2oyvyv6xegu",
    "createdAt": "2025-07-01T11:43:57.337Z"
  },
  {
    "id": "cmckgmbvi00ivv2qb4nayo614",
    "role": "ACCOUNTANT",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:57.342Z"
  },
  {
    "id": "cmckgmbvp00ixv2qbl1u6vfxj",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglia0001av2oyt3ej464w",
    "createdAt": "2025-07-01T11:43:57.349Z"
  },
  {
    "id": "cmckgmbvt00izv2qbmis78wce",
    "role": "ACCOUNTANT",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:57.353Z"
  },
  {
    "id": "cmckgmbvw00j1v2qbh0ngmpdo",
    "role": "ACCOUNTANT",
    "permissionId": "cmckgli8d000uv2oy3r0340hp",
    "createdAt": "2025-07-01T11:43:57.357Z"
  },
  {
    "id": "cmckgmbw000j3v2qbqebu2zh3",
    "role": "ACCOUNTANT",
    "permissionId": "cmckgli8h000vv2oyvuaw7oqd",
    "createdAt": "2025-07-01T11:43:57.360Z"
  },
  {
    "id": "cmckgmbw400j5v2qb7sgv37fp",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:57.364Z"
  },
  {
    "id": "cmckgmbw800j7v2qbf1otz8au",
    "role": "ACCOUNTANT",
    "permissionId": "cmckgliau001iv2oyf03bgqgy",
    "createdAt": "2025-07-01T11:43:57.368Z"
  },
  {
    "id": "cmckgmbwc00j9v2qbs4up54es",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglif3002qv2oy76dyb5kn",
    "createdAt": "2025-07-01T11:43:57.372Z"
  },
  {
    "id": "cmckgmbwg00jbv2qbaks6140o",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglife002tv2oyhdx70b6d",
    "createdAt": "2025-07-01T11:43:57.376Z"
  },
  {
    "id": "cmckgmbwk00jdv2qbbd6bmyfy",
    "role": "ACCOUNTANT",
    "permissionId": "cmckglifi002uv2oybouy8wqb",
    "createdAt": "2025-07-01T11:43:57.380Z"
  },
  {
    "id": "cmckgmbwr00jfv2qb5fg3yjrz",
    "role": "WAREHOUSE",
    "permissionId": "cmckglia3001bv2oyihiacgxm",
    "createdAt": "2025-07-01T11:43:57.388Z"
  },
  {
    "id": "cmckgmbwv00jhv2qbgnz9chkc",
    "role": "WAREHOUSE",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:57.392Z"
  },
  {
    "id": "cmckgmbwz00jjv2qbwgeeihg5",
    "role": "WAREHOUSE",
    "permissionId": "cmckgliab001dv2oyvncxrqqf",
    "createdAt": "2025-07-01T11:43:57.396Z"
  },
  {
    "id": "cmckgmbx300jlv2qblr3hlzty",
    "role": "WAREHOUSE",
    "permissionId": "cmckgliaj001fv2oyavvsbqsk",
    "createdAt": "2025-07-01T11:43:57.399Z"
  },
  {
    "id": "cmckgmbx700jnv2qbnlpbouiy",
    "role": "WAREHOUSE",
    "permissionId": "cmckglian001gv2oy5gbu21ja",
    "createdAt": "2025-07-01T11:43:57.403Z"
  },
  {
    "id": "cmckgmbxa00jpv2qbzwbtudfj",
    "role": "WAREHOUSE",
    "permissionId": "cmckgliaq001hv2oyn1kmeiik",
    "createdAt": "2025-07-01T11:43:57.407Z"
  },
  {
    "id": "cmckgmbxe00jrv2qbuvm09vbm",
    "role": "WAREHOUSE",
    "permissionId": "cmckgliau001iv2oyf03bgqgy",
    "createdAt": "2025-07-01T11:43:57.411Z"
  },
  {
    "id": "cmckgmbxj00jtv2qb8znaqhk3",
    "role": "WAREHOUSE",
    "permissionId": "cmckgliax001jv2oymk0zjjzq",
    "createdAt": "2025-07-01T11:43:57.415Z"
  },
  {
    "id": "cmckgmbxn00jvv2qbhvc7vrw8",
    "role": "WAREHOUSE",
    "permissionId": "cmcd9idq60001v267in77l6m7",
    "createdAt": "2025-07-01T11:43:57.420Z"
  },
  {
    "id": "cmckgmbxr00jxv2qbd032z4r4",
    "role": "WAREHOUSE",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:57.423Z"
  },
  {
    "id": "cmckgmbxu00jzv2qbtfs1f5it",
    "role": "WAREHOUSE",
    "permissionId": "cmcd9idqf0002v2679qh2mnwp",
    "createdAt": "2025-07-01T11:43:57.427Z"
  },
  {
    "id": "cmckgmbxy00k1v2qbg770ujon",
    "role": "WAREHOUSE",
    "permissionId": "cmckglibf001ov2oym62e17t5",
    "createdAt": "2025-07-01T11:43:57.431Z"
  },
  {
    "id": "cmckgmby300k3v2qb6qccspll",
    "role": "WAREHOUSE",
    "permissionId": "cmckglibi001pv2oyad3w0gtl",
    "createdAt": "2025-07-01T11:43:57.435Z"
  },
  {
    "id": "cmckgmbyb00k5v2qb4zzppqot",
    "role": "WAREHOUSE",
    "permissionId": "cmckglibq001rv2oy8objq60z",
    "createdAt": "2025-07-01T11:43:57.443Z"
  },
  {
    "id": "cmckgmbyh00k7v2qbuvfe7cos",
    "role": "WAREHOUSE",
    "permissionId": "cmckglidw002dv2oy9y0vnv3z",
    "createdAt": "2025-07-01T11:43:57.449Z"
  },
  {
    "id": "cmckgmbyl00k9v2qb3fupctxj",
    "role": "WAREHOUSE",
    "permissionId": "cmckglie9002hv2oy3mo5k34d",
    "createdAt": "2025-07-01T11:43:57.454Z"
  },
  {
    "id": "cmckgmbyp00kbv2qbqakw4y1k",
    "role": "WAREHOUSE",
    "permissionId": "cmckglied002iv2oyvyv6xegu",
    "createdAt": "2025-07-01T11:43:57.458Z"
  },
  {
    "id": "cmckgmbyt00kdv2qbykae9bgi",
    "role": "WAREHOUSE",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:57.462Z"
  },
  {
    "id": "cmckgmbyx00kfv2qbkjyb8ghv",
    "role": "WAREHOUSE",
    "permissionId": "cmckglia0001av2oyt3ej464w",
    "createdAt": "2025-07-01T11:43:57.466Z"
  },
  {
    "id": "cmckgmbz100khv2qb5tf7glb0",
    "role": "WAREHOUSE",
    "permissionId": "cmckglif7002rv2oyyiuffxec",
    "createdAt": "2025-07-01T11:43:57.470Z"
  },
  {
    "id": "cmckgmbz500kjv2qbge1gte6n",
    "role": "WAREHOUSE",
    "permissionId": "cmckglife002tv2oyhdx70b6d",
    "createdAt": "2025-07-01T11:43:57.473Z"
  },
  {
    "id": "cmckgmbzc00klv2qb66i4wcf0",
    "role": "VIEWER",
    "permissionId": "cmckgli580001v2oytsoqhuew",
    "createdAt": "2025-07-01T11:43:57.481Z"
  },
  {
    "id": "cmckgmbzh00knv2qb4qreh8qs",
    "role": "VIEWER",
    "permissionId": "cmcfbja0k0000v2ykjqvwqeoc",
    "createdAt": "2025-07-01T11:43:57.486Z"
  },
  {
    "id": "cmckgmbzm00kpv2qb39mqssuj",
    "role": "VIEWER",
    "permissionId": "cmckgli6m000dv2oyjim8r5ak",
    "createdAt": "2025-07-01T11:43:57.491Z"
  },
  {
    "id": "cmckgmbzq00krv2qb8j4terik",
    "role": "VIEWER",
    "permissionId": "cmckgli7e000lv2oyur9ys6ws",
    "createdAt": "2025-07-01T11:43:57.495Z"
  },
  {
    "id": "cmckgmbzu00ktv2qb3n3k94jm",
    "role": "VIEWER",
    "permissionId": "cmckgli7z000rv2oy1sfc0t33",
    "createdAt": "2025-07-01T11:43:57.499Z"
  },
  {
    "id": "cmckgmc0000kvv2qbdw2az4nn",
    "role": "VIEWER",
    "permissionId": "cmckgli8p000xv2oyvrlbwthg",
    "createdAt": "2025-07-01T11:43:57.504Z"
  },
  {
    "id": "cmckgmc0700kxv2qbzh0m8ofi",
    "role": "VIEWER",
    "permissionId": "cmckgli9j0015v2oyf7vxwk27",
    "createdAt": "2025-07-01T11:43:57.511Z"
  },
  {
    "id": "cmckgmc0a00kzv2qb5fv36lum",
    "role": "VIEWER",
    "permissionId": "cmckglia7001cv2oyays5zlo9",
    "createdAt": "2025-07-01T11:43:57.515Z"
  },
  {
    "id": "cmckgmc0f00l1v2qbp229g53j",
    "role": "VIEWER",
    "permissionId": "cmcd9idoh0000v267dker3mwr",
    "createdAt": "2025-07-01T11:43:57.519Z"
  },
  {
    "id": "cmckgmc0j00l3v2qbi8cfnrz1",
    "role": "VIEWER",
    "permissionId": "cmckglicn0020v2oyhqdrdeim",
    "createdAt": "2025-07-01T11:43:57.523Z"
  },
  {
    "id": "cmckgmc0n00l5v2qb5hopo9fl",
    "role": "VIEWER",
    "permissionId": "cmckglidb0027v2oymv4y1089",
    "createdAt": "2025-07-01T11:43:57.527Z"
  },
  {
    "id": "cmckgmc0r00l7v2qbaxp8l39l",
    "role": "VIEWER",
    "permissionId": "cmckglidw002dv2oy9y0vnv3z",
    "createdAt": "2025-07-01T11:43:57.531Z"
  },
  {
    "id": "cmckgmc0w00l9v2qba2pvu0lw",
    "role": "VIEWER",
    "permissionId": "cmckglif0002pv2oyo9is7rvk",
    "createdAt": "2025-07-01T11:43:57.536Z"
  },
  {
    "id": "cmckgmc0z00lbv2qbccfl7fyr",
    "role": "VIEWER",
    "permissionId": "cmckglif7002rv2oyyiuffxec",
    "createdAt": "2025-07-01T11:43:57.540Z"
  },
  {
    "id": "cmckgmc1400ldv2qbs70gzfzk",
    "role": "VIEWER",
    "permissionId": "cmckglifb002sv2oyr4boidmv",
    "createdAt": "2025-07-01T11:43:57.544Z"
  },
  {
    "id": "cmckyu5vm0002v2lyas5ng3r4",
    "role": "Admin",
    "permissionId": "cmckyu5v00000v2lyw8zvvz7g",
    "createdAt": "2025-07-01T20:13:55.906Z"
  },
  {
    "id": "cmckyu5vu0004v2lyi5z5h1pq",
    "role": "Sales Manager",
    "permissionId": "cmckyu5v00000v2lyw8zvvz7g",
    "createdAt": "2025-07-01T20:13:55.914Z"
  },
  {
    "id": "cmckyu5w10006v2lyz9igpy1v",
    "role": "Sales Supervisor",
    "permissionId": "cmckyu5v00000v2lyw8zvvz7g",
    "createdAt": "2025-07-01T20:13:55.921Z"
  },
  {
    "id": "cmckyu5wa0008v2lye0ujkqtp",
    "role": "Warehouse",
    "permissionId": "cmckyu5v00000v2lyw8zvvz7g",
    "createdAt": "2025-07-01T20:13:55.931Z"
  }
];
  
  for (const rp of rolePermissions) {
    await prisma.rolePermission.create({ data: rp });
  }
  console.log('✅ Role permissions assigned');
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'demo123', 10);
  const users = [
  {
    "id": "cmcd8ue8m0002v2dpksszwoa2",
    "username": "sales.rep2",
    "email": "sales.rep2@uaemarine.ae",
    "role": "SALES_REP",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z",
    "managerId": null
  },
  {
    "id": "cmcd8ue970008v2dpzdfcd8co",
    "username": "accountant",
    "email": "accountant@uaemarine.ae",
    "role": "ACCOUNTANT",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.516Z",
    "updatedAt": "2025-06-26T10:31:53.516Z",
    "managerId": null
  },
  {
    "id": "cmcd8ue9d000av2dpj4ualpl5",
    "username": "warehouse",
    "email": "warehouse@uaemarine.ae",
    "role": "WAREHOUSE",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.522Z",
    "updatedAt": "2025-06-26T10:31:53.522Z",
    "managerId": null
  },
  {
    "id": "cmcd8ue8m0001v2dpq9wzxx52",
    "username": "sales.rep1",
    "email": "sales.rep1@uaemarine.ae",
    "role": "SALES_REP",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z",
    "managerId": null
  },
  {
    "id": "cmcd8ue8m0000v2dpp3pz6kmu",
    "username": "sales.manager",
    "email": "sales.manager@uaemarine.ae",
    "role": "MANAGER",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z",
    "managerId": null
  },
  {
    "id": "cmcd8ue8m0003v2dpmdljcvry",
    "username": "admin",
    "email": "admin@uaemarine.ae",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z",
    "managerId": null
  }
];
  const profiles = [
  {
    "id": "cmcd8ue8o0007v2dpb9ug2geh",
    "userId": "cmcd8ue8m0002v2dpksszwoa2",
    "firstName": "Fatima",
    "lastName": "Al Nahyan",
    "phone": "+971504567890",
    "department": "Sales",
    "jobTitle": "Sales Executive",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z"
  },
  {
    "id": "cmcd8ue970009v2dp0cg7rt0b",
    "userId": "cmcd8ue970008v2dpzdfcd8co",
    "firstName": "Rashid",
    "lastName": "Al Muhairi",
    "phone": "+971505678901",
    "department": "Finance",
    "jobTitle": "Chief Accountant",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.516Z",
    "updatedAt": "2025-06-26T10:31:53.516Z"
  },
  {
    "id": "cmcd8ue9d000bv2dpv91lvmat",
    "userId": "cmcd8ue9d000av2dpj4ualpl5",
    "firstName": "Omar",
    "lastName": "Al Dhaheri",
    "phone": "+971506789012",
    "department": "Operations",
    "jobTitle": "Warehouse Manager",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.522Z",
    "updatedAt": "2025-06-26T10:31:53.522Z"
  },
  {
    "id": "cmcd8ue8n0005v2dpi5tlujlx",
    "userId": "cmcd8ue8m0001v2dpq9wzxx52",
    "firstName": "Khalid",
    "lastName": "Al Qassimi",
    "phone": "+971503456789",
    "department": "Sales",
    "jobTitle": "Senior Sales Executive",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z"
  },
  {
    "id": "cmcd8ue8n0004v2dp3iu1if0c",
    "userId": "cmcd8ue8m0000v2dpp3pz6kmu",
    "firstName": "Mohammed",
    "lastName": "Al Maktoum",
    "phone": "+971502345678",
    "department": "Sales",
    "jobTitle": "Sales Manager",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z"
  },
  {
    "id": "cmcd8ue8n0006v2dp24ans9xs",
    "userId": "cmcd8ue8m0003v2dpmdljcvry",
    "firstName": "Ahmed",
    "lastName": "Al Rashid",
    "phone": "+971501234567",
    "department": "Management",
    "jobTitle": "General Manager",
    "avatarUrl": null,
    "timezone": "UTC",
    "language": "en",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-06-26T10:31:53.494Z",
    "updatedAt": "2025-06-26T10:31:53.494Z"
  }
];
  
  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }
    });
  }
  
  for (const profile of profiles) {
    await prisma.userProfile.create({
      data: {
        ...profile,
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
      }
    });
  }
  console.log('✅ Users seeded');
}

async function seedChartOfAccounts() {
  console.log('📊 Seeding chart of accounts...');
  const accounts = [
  {
    "id": "cmcd8ueby000iv2dpzn8rk48h",
    "code": "1000",
    "name": "Cash - AED",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.614Z",
    "updatedAt": "2025-06-26T10:31:53.614Z"
  },
  {
    "id": "cmcd8uec3000jv2dpdroj2n4s",
    "code": "1001",
    "name": "Cash - USD",
    "type": "ASSET",
    "currency": "USD",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.619Z",
    "updatedAt": "2025-06-26T10:31:53.619Z"
  },
  {
    "id": "cmcd8uec6000kv2dp13dwbxsi",
    "code": "1002",
    "name": "Cash - EUR",
    "type": "ASSET",
    "currency": "EUR",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.623Z",
    "updatedAt": "2025-06-26T10:31:53.623Z"
  },
  {
    "id": "cmcd8ueca000lv2dpbkv18v31",
    "code": "1100",
    "name": "Accounts Receivable",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": -1239,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.626Z",
    "updatedAt": "2025-07-01T20:07:40.542Z"
  },
  {
    "id": "cmcd8uecd000mv2dp2hfpwyxm",
    "code": "1200",
    "name": "Inventory - Marine Parts",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 14938.2,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.629Z",
    "updatedAt": "2025-07-02T02:40:52.491Z"
  },
  {
    "id": "cmcd8uech000nv2dp6ir2nf87",
    "code": "1300",
    "name": "Prepaid Expenses",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.633Z",
    "updatedAt": "2025-06-26T10:31:53.633Z"
  },
  {
    "id": "cmcd8ueck000ov2dp609xbs5k",
    "code": "1500",
    "name": "Property, Plant & Equipment",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.636Z",
    "updatedAt": "2025-06-26T10:31:53.636Z"
  },
  {
    "id": "cmcd8uecn000pv2dp3olwvml1",
    "code": "1510",
    "name": "Workshop Equipment",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.640Z",
    "updatedAt": "2025-06-26T10:31:53.640Z"
  },
  {
    "id": "cmcd8uecr000qv2dptrcadimo",
    "code": "1520",
    "name": "Service Vehicles",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.643Z",
    "updatedAt": "2025-06-26T10:31:53.643Z"
  },
  {
    "id": "cmcd8uecu000rv2dp3hsmwr9r",
    "code": "2000",
    "name": "Accounts Payable",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.647Z",
    "updatedAt": "2025-06-26T10:31:53.647Z"
  },
  {
    "id": "cmcd8uecz000sv2dpmy4qjgyj",
    "code": "2100",
    "name": "VAT Payable",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.651Z",
    "updatedAt": "2025-06-26T10:31:53.651Z"
  },
  {
    "id": "cmcd8ueda000tv2dp1edarllq",
    "code": "2200",
    "name": "Salaries Payable",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 173,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.662Z",
    "updatedAt": "2025-06-27T18:35:12.195Z"
  },
  {
    "id": "cmcd8uedk000uv2dpen09s3i5",
    "code": "2210",
    "name": "Gratuity Payable",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.672Z",
    "updatedAt": "2025-06-26T10:31:53.672Z"
  },
  {
    "id": "cmcd8uedn000vv2dpkggce12m",
    "code": "2300",
    "name": "Short-term Loans",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.676Z",
    "updatedAt": "2025-06-26T10:31:53.676Z"
  },
  {
    "id": "cmcd8uedq000wv2dpmp5st4at",
    "code": "3000",
    "name": "Share Capital",
    "type": "EQUITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.679Z",
    "updatedAt": "2025-06-26T10:31:53.679Z"
  },
  {
    "id": "cmcd8uedu000xv2dp7p8yvr63",
    "code": "3100",
    "name": "Retained Earnings",
    "type": "EQUITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.682Z",
    "updatedAt": "2025-06-26T10:31:53.682Z"
  },
  {
    "id": "cmcd8uedy000yv2dp6x9kmkg3",
    "code": "4000",
    "name": "Sales - Marine Spare Parts",
    "type": "INCOME",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.687Z",
    "updatedAt": "2025-06-26T10:31:53.687Z"
  },
  {
    "id": "cmcd8uee2000zv2dp4wgh0bi7",
    "code": "4100",
    "name": "Service Revenue - Maintenance",
    "type": "INCOME",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 25178,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.690Z",
    "updatedAt": "2025-07-01T20:07:40.545Z"
  },
  {
    "id": "cmcd8uee50010v2dpps9e7nnc",
    "code": "4110",
    "name": "Service Revenue - Emergency",
    "type": "INCOME",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.693Z",
    "updatedAt": "2025-06-26T10:31:53.693Z"
  },
  {
    "id": "cmcd8ueeb0011v2dpb9litdw5",
    "code": "4200",
    "name": "Other Income",
    "type": "INCOME",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.700Z",
    "updatedAt": "2025-06-26T10:31:53.700Z"
  },
  {
    "id": "cmcd8ueeo0012v2dps4rseggd",
    "code": "5000",
    "name": "Cost of Goods Sold",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 7704,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.712Z",
    "updatedAt": "2025-06-27T17:33:44.710Z"
  },
  {
    "id": "cmcd8ueer0013v2dp2p08ixej",
    "code": "5100",
    "name": "Salaries & Benefits",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.715Z",
    "updatedAt": "2025-06-26T10:31:53.715Z"
  },
  {
    "id": "cmcd8ueew0014v2dp6in22bdu",
    "code": "5110",
    "name": "Direct Labor Cost",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.721Z",
    "updatedAt": "2025-06-26T10:31:53.721Z"
  },
  {
    "id": "cmcd8ueez0015v2dpa0dade64",
    "code": "5200",
    "name": "Rent Expense",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.724Z",
    "updatedAt": "2025-06-26T10:31:53.724Z"
  },
  {
    "id": "cmcd8uef30016v2dpvfhxxqet",
    "code": "5300",
    "name": "Utilities",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.727Z",
    "updatedAt": "2025-06-26T10:31:53.727Z"
  },
  {
    "id": "cmcd8uef60017v2dp9auwcx0m",
    "code": "5400",
    "name": "Marketing & Advertising",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.731Z",
    "updatedAt": "2025-06-26T10:31:53.731Z"
  },
  {
    "id": "cmcd8uefb0018v2dp8dvw0rtg",
    "code": "5500",
    "name": "Office Supplies",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.736Z",
    "updatedAt": "2025-06-26T10:31:53.736Z"
  },
  {
    "id": "cmcd8ueff0019v2dpvuyffpzz",
    "code": "5600",
    "name": "Transportation",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.739Z",
    "updatedAt": "2025-06-26T10:31:53.739Z"
  },
  {
    "id": "cmcd8uefj001av2dp6trd4he3",
    "code": "5700",
    "name": "Professional Fees",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.743Z",
    "updatedAt": "2025-06-26T10:31:53.743Z"
  },
  {
    "id": "cmcd8uefm001bv2dpe4ac63yt",
    "code": "5800",
    "name": "Insurance",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.746Z",
    "updatedAt": "2025-06-26T10:31:53.746Z"
  },
  {
    "id": "cmcd8uefp001cv2dpr95ymugw",
    "code": "5900",
    "name": "Other Expenses",
    "type": "EXPENSE",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": -20109.2,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.750Z",
    "updatedAt": "2025-07-02T02:40:52.493Z"
  },
  {
    "id": "cmcd8uega001lv2dpk4xe57gh",
    "code": "2010-002",
    "name": "AP - Cummins Arabia FZE",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.770Z",
    "updatedAt": "2025-06-26T10:31:53.770Z"
  },
  {
    "id": "cmcd8uegr001ov2dpx3620fif",
    "code": "2010-008",
    "name": "AP - Deutz Middle East",
    "type": "LIABILITY",
    "currency": "EUR",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.787Z",
    "updatedAt": "2025-06-26T10:31:53.787Z"
  },
  {
    "id": "cmcd8uegw001qv2dpptxu5146",
    "code": "2010-003",
    "name": "AP - MAN Energy Solutions Gulf",
    "type": "LIABILITY",
    "currency": "EUR",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.793Z",
    "updatedAt": "2025-06-26T10:31:53.793Z"
  },
  {
    "id": "cmcd8ueh0001sv2dp0kluv2kt",
    "code": "2010-009",
    "name": "AP - Perkins Arabia",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.797Z",
    "updatedAt": "2025-06-26T10:31:53.797Z"
  },
  {
    "id": "cmcd8ueh6001uv2dpdd5p7alx",
    "code": "2010-004",
    "name": "AP - Wärtsilä Gulf FZE",
    "type": "LIABILITY",
    "currency": "EUR",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.802Z",
    "updatedAt": "2025-06-26T10:31:53.802Z"
  },
  {
    "id": "cmcd8uehi001wv2dpo7ftmrwo",
    "code": "2010-010",
    "name": "AP - John Deere Marine Gulf",
    "type": "LIABILITY",
    "currency": "USD",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.815Z",
    "updatedAt": "2025-06-26T10:31:53.815Z"
  },
  {
    "id": "cmcd8uehp001yv2dpbmzdqmqi",
    "code": "2010-006",
    "name": "AP - MTU Middle East FZE",
    "type": "LIABILITY",
    "currency": "EUR",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.822Z",
    "updatedAt": "2025-06-26T10:31:53.822Z"
  },
  {
    "id": "cmcd8uegb001mv2dpocqwgbz7",
    "code": "2010-001",
    "name": "AP - Caterpillar Marine - Middle East",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.770Z",
    "updatedAt": "2025-06-26T10:31:53.770Z"
  },
  {
    "id": "cmcd8uega001gv2dpk0mje8gm",
    "code": "2010-005",
    "name": "AP - Volvo Penta Middle East",
    "type": "LIABILITY",
    "currency": "USD",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.770Z",
    "updatedAt": "2025-06-26T10:31:53.770Z"
  },
  {
    "id": "cmcd8uega001kv2dpgznahp15",
    "code": "2010-007",
    "name": "AP - Yanmar Gulf FZE",
    "type": "LIABILITY",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.770Z",
    "updatedAt": "2025-06-26T10:31:53.770Z"
  },
  {
    "id": "cmcd8ug2y00irv2dpukt0zw6w",
    "code": "1110-CUST-00005",
    "name": "AR - Gulf Navigation Holding",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.882Z",
    "updatedAt": "2025-06-26T10:31:55.882Z"
  },
  {
    "id": "cmcd8ug3b00itv2dpl93dh1gr",
    "code": "1110-CUST-00006",
    "name": "AR - Al Marwan Shipping",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.895Z",
    "updatedAt": "2025-06-26T10:31:55.895Z"
  },
  {
    "id": "cmcd8ug3l00ivv2dpabymz4uq",
    "code": "1110-CUST-00001",
    "name": "AR - Abu Dhabi Ports Company",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.904Z",
    "updatedAt": "2025-06-26T10:31:55.904Z"
  },
  {
    "id": "cmcd8ug3v00ixv2dpnkys76d3",
    "code": "1110-CUST-00009",
    "name": "AR - Fujairah Port Authority",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.915Z",
    "updatedAt": "2025-06-26T10:31:55.915Z"
  },
  {
    "id": "cmcd8ug4700izv2dpkh8bxb0f",
    "code": "1110-CUST-00010",
    "name": "AR - Abu Dhabi Marine Services",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.927Z",
    "updatedAt": "2025-06-26T10:31:55.927Z"
  },
  {
    "id": "cmcd8ug4n00j3v2dppx92k6qf",
    "code": "1110-CUST-00007",
    "name": "AR - Dubai Maritime City Authority",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.943Z",
    "updatedAt": "2025-06-26T10:31:55.943Z"
  },
  {
    "id": "cmcd8ug4y00j5v2dpjq25ix8z",
    "code": "1110-CUST-00003",
    "name": "AR - Sharjah Port Authority",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.954Z",
    "updatedAt": "2025-06-26T10:31:55.954Z"
  },
  {
    "id": "cmcd8ug5500j7v2dplmxfhszi",
    "code": "1110-CUST-00002",
    "name": "AR - DP World - Jebel Ali",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.962Z",
    "updatedAt": "2025-06-26T10:31:55.962Z"
  },
  {
    "id": "cmcd8ug5h00j9v2dp3zyfthoo",
    "code": "1110-CUST-00004",
    "name": "AR - Emirates Shipping Line",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.971Z",
    "updatedAt": "2025-06-26T10:31:55.971Z"
  },
  {
    "id": "cmcd8ug6b00jbv2dp3p1p2var",
    "code": "1110-CUST-00012",
    "name": "AR - Gulf Craft Shipyard",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:56.003Z",
    "updatedAt": "2025-06-26T10:31:56.003Z"
  },
  {
    "id": "cmcd8ug6o00jdv2dpoi98oxgm",
    "code": "1110-CUST-00008",
    "name": "AR - RAK Ports",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:56.016Z",
    "updatedAt": "2025-06-26T10:31:56.016Z"
  },
  {
    "id": "cmcd8ug4h00j1v2dp02bsgmko",
    "code": "1110-CUST-00011",
    "name": "AR - Al Seer Marine Supplies",
    "type": "ASSET",
    "currency": "AED",
    "description": null,
    "parentId": null,
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.932Z",
    "updatedAt": "2025-06-26T10:31:55.932Z"
  },
  {
    "id": "cmcf7shk80001v2eavtkmzvvs",
    "code": "1110",
    "name": "Bank Accounts",
    "type": "ASSET",
    "currency": "AED",
    "description": "All bank and financial institution accounts",
    "parentId": "cmcd8ueby000iv2dpzn8rk48h",
    "balance": 24057,
    "status": "ACTIVE",
    "isSystemAccount": true,
    "createdBy": "system",
    "createdAt": "2025-06-27T19:37:57.224Z",
    "updatedAt": "2025-07-01T11:07:43.580Z"
  },
  {
    "id": "cmcffnduz000bv2gnege9o80a",
    "code": "1200-CUST-0013-6068-276074",
    "name": "AR - Dubai Drydocks World",
    "type": "ASSET",
    "currency": "AED",
    "description": "Accounts Receivable for Dubai Drydocks World",
    "parentId": "cmcd8uecd000mv2dp2hfpwyxm",
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "system",
    "createdAt": "2025-06-27T23:17:56.075Z",
    "updatedAt": "2025-06-27T23:17:56.075Z"
  },
  {
    "id": "cmcj5swpl0005v2n7oaak6pyt",
    "code": "1200-CUST-0014-2319-602324",
    "name": "AR - jj s",
    "type": "ASSET",
    "currency": "AED",
    "description": "Accounts Receivable for jj s",
    "parentId": "cmcd8uecd000mv2dp2hfpwyxm",
    "balance": 0,
    "status": "ACTIVE",
    "isSystemAccount": false,
    "createdBy": "system",
    "createdAt": "2025-06-30T13:53:22.327Z",
    "updatedAt": "2025-06-30T13:53:22.327Z"
  }
];
  
  for (const account of accounts) {
    await prisma.account.create({
      data: {
        ...account,
        balance: 0, // Reset all balances to zero for fresh start
        createdBy: 'system', // Use system as creator instead of non-existent user
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
      }
    });
  }
  console.log('✅ Chart of accounts seeded');
}

async function seedTaxConfiguration() {
  console.log('💰 Seeding tax configuration...');
  const categories = [
  {
    "id": "cmcd8ug7z00jev2dps2l73deq",
    "code": "VAT-UAE",
    "name": "UAE VAT",
    "description": "Value Added Tax - UAE",
    "isActive": true,
    "isDefault": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:56.064Z",
    "updatedAt": "2025-06-26T10:31:56.064Z"
  },
  {
    "id": "cmcfaq75b0008v2oxm8fj6sw3",
    "code": "STANDARD",
    "name": "Standard Tax",
    "description": "",
    "isActive": true,
    "isDefault": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-27T21:00:09.264Z",
    "updatedAt": "2025-06-27T21:00:18.449Z"
  }
];
  const rates = [
  {
    "id": "cmcd8ug8400jgv2dpq9uotrcu",
    "code": "VAT-5",
    "name": "UAE VAT 5%",
    "description": null,
    "rate": 5,
    "categoryId": "cmcd8ug7z00jev2dps2l73deq",
    "taxType": "BOTH",
    "appliesTo": "ALL",
    "effectiveFrom": "2025-06-26T10:31:56.068Z",
    "effectiveTo": null,
    "isActive": true,
    "isDefault": true,
    "isCompound": false,
    "collectedAccountId": "cmcd8uecz000sv2dpmy4qjgyj",
    "paidAccountId": "cmcd8uecz000sv2dpmy4qjgyj",
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:56.068Z",
    "updatedAt": "2025-06-26T10:31:56.068Z"
  },
  {
    "id": "cmcfape7a0007v2oxyyivo4w8",
    "code": "UAE_8",
    "name": "UAE 8%",
    "description": "",
    "rate": 8,
    "categoryId": "cmcd8ug7z00jev2dps2l73deq",
    "taxType": "SALES",
    "appliesTo": "ALL",
    "effectiveFrom": "2025-06-27T00:00:00.000Z",
    "effectiveTo": null,
    "isActive": true,
    "isDefault": false,
    "isCompound": false,
    "collectedAccountId": null,
    "paidAccountId": null,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-27T20:59:31.750Z",
    "updatedAt": "2025-06-27T20:59:31.750Z"
  }
];
  
  for (const category of categories) {
    await prisma.taxCategory.create({
      data: {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt)
      }
    });
  }
  
  for (const rate of rates) {
    await prisma.taxRate.create({
      data: {
        ...rate,
        rate: rate.rate || 0,
        createdAt: new Date(rate.createdAt),
        updatedAt: new Date(rate.updatedAt)
      }
    });
  }
  console.log('✅ Tax configuration seeded');
}

async function seedLocations() {
  console.log('📍 Seeding locations...');
  const locations = [
  {
    "id": "cmcd8ufwq00hpv2dpy6a0o383",
    "locationCode": "MAIN-WH",
    "name": "Main Warehouse - Jebel Ali",
    "type": "WAREHOUSE",
    "description": null,
    "address": "Jebel Ali Free Zone, Dubai, UAE",
    "city": null,
    "state": null,
    "country": "US",
    "postalCode": null,
    "contactPerson": null,
    "phone": null,
    "email": null,
    "isActive": true,
    "isDefault": true,
    "allowNegativeStock": false,
    "maxCapacity": 10000,
    "currentUtilization": 0,
    "inventoryAccountId": "cmcd8uecd000mv2dp2hfpwyxm",
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.658Z",
    "updatedAt": "2025-06-26T10:31:55.658Z"
  },
  {
    "id": "cmcd8ufwu00hvv2dp6s7ftsi2",
    "locationCode": "SVC-VAN-02",
    "name": "Mobile Service Van 02",
    "type": "VEHICLE",
    "description": null,
    "address": "Mobile Unit",
    "city": null,
    "state": null,
    "country": "US",
    "postalCode": null,
    "contactPerson": null,
    "phone": null,
    "email": null,
    "isActive": true,
    "isDefault": false,
    "allowNegativeStock": false,
    "maxCapacity": 100,
    "currentUtilization": 0,
    "inventoryAccountId": "cmcd8uecd000mv2dp2hfpwyxm",
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.662Z",
    "updatedAt": "2025-06-26T10:31:55.662Z"
  },
  {
    "id": "cmcd8ufws00htv2dpmvgsq6bp",
    "locationCode": "SVC-VAN-01",
    "name": "Mobile Service Van 01",
    "type": "VEHICLE",
    "description": null,
    "address": "Mobile Unit",
    "city": null,
    "state": null,
    "country": "US",
    "postalCode": null,
    "contactPerson": null,
    "phone": null,
    "email": null,
    "isActive": true,
    "isDefault": false,
    "allowNegativeStock": false,
    "maxCapacity": 100,
    "currentUtilization": 0,
    "inventoryAccountId": "cmcd8uecd000mv2dp2hfpwyxm",
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.660Z",
    "updatedAt": "2025-06-26T10:31:55.660Z"
  },
  {
    "id": "cmcd8ufws00hrv2dp6z4p4gdu",
    "locationCode": "ABU-WH",
    "name": "Abu Dhabi Warehouse",
    "type": "WAREHOUSE",
    "description": null,
    "address": "Mussafah Industrial Area, Abu Dhabi, UAE",
    "city": null,
    "state": null,
    "country": "US",
    "postalCode": null,
    "contactPerson": null,
    "phone": null,
    "email": null,
    "isActive": true,
    "isDefault": false,
    "allowNegativeStock": false,
    "maxCapacity": 5000,
    "currentUtilization": 0,
    "inventoryAccountId": "cmcd8uecd000mv2dp2hfpwyxm",
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:55.660Z",
    "updatedAt": "2025-06-26T10:31:55.660Z"
  }
];
  
  for (const location of locations) {
    await prisma.location.create({
      data: {
        ...location,
        createdAt: new Date(location.createdAt),
        updatedAt: new Date(location.updatedAt)
      }
    });
  }
  console.log('✅ Locations seeded');
}

async function seedMasterData() {
  console.log('📋 Seeding master data (categories & units)...');
  
  // Categories
  const categories = [
  {
    "id": "cmcd8ueiu001zv2dp9melr5wc",
    "code": "ENG-CORE",
    "name": "Engine Core Components",
    "description": "Marine engine engine core components",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.862Z",
    "updatedAt": "2025-06-26T10:31:53.862Z"
  },
  {
    "id": "cmcd8ueix0023v2dpbmv2fcyb",
    "code": "TRANS",
    "name": "Marine Transmission",
    "description": "Marine engine marine transmission",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.865Z",
    "updatedAt": "2025-06-26T10:31:53.865Z"
  },
  {
    "id": "cmcd8uej10024v2dpz6pekcxm",
    "code": "LUB-SYS",
    "name": "Lubrication System",
    "description": "Marine engine lubrication system",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.870Z",
    "updatedAt": "2025-06-26T10:31:53.870Z"
  },
  {
    "id": "cmcd8uejh0025v2dpimsuss6z",
    "code": "FUEL-SYS",
    "name": "Fuel System Parts",
    "description": "Marine engine fuel system parts",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.886Z",
    "updatedAt": "2025-06-26T10:31:53.886Z"
  },
  {
    "id": "cmcd8uejz0026v2dphh58d5hn",
    "code": "COOL-SYS",
    "name": "Cooling System Parts",
    "description": "Marine engine cooling system parts",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.904Z",
    "updatedAt": "2025-06-26T10:31:53.904Z"
  },
  {
    "id": "cmcd8ueiw0022v2dpexqgcoia",
    "code": "EXHAUST",
    "name": "Exhaust System",
    "description": "Marine engine exhaust system",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.864Z",
    "updatedAt": "2025-06-26T10:31:53.864Z"
  },
  {
    "id": "cmcd8ueiv0021v2dpq6q645i4",
    "code": "ELEC",
    "name": "Electrical Components",
    "description": "Marine engine electrical components",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.864Z",
    "updatedAt": "2025-06-26T10:31:53.864Z"
  },
  {
    "id": "cmcd8ueiv0020v2dpr10tyckz",
    "code": "TURBO",
    "name": "Turbocharger Components",
    "description": "Marine engine turbocharger components",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.864Z",
    "updatedAt": "2025-06-26T10:31:53.864Z"
  },
  {
    "id": "cmcd8uemd0027v2dp9pszhfkm",
    "code": "SERVICES",
    "name": "Marine Services",
    "description": "Marine engine maintenance and repair services",
    "parentId": null,
    "isActive": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.989Z",
    "updatedAt": "2025-06-26T10:31:53.989Z"
  },
  {
    "id": "cmcf390240002v27z8j6fctc6",
    "code": "TEST_COMPONENTS",
    "name": "Test Components",
    "description": "",
    "parentId": null,
    "isActive": true,
    "createdBy": "system",
    "createdAt": "2025-06-27T17:30:49.612Z",
    "updatedAt": "2025-06-27T17:30:49.612Z"
  }
];
  for (const category of categories) {
    await prisma.category.create({
      data: {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt)
      }
    });
  }
  
  // Units of measure
  const uoms = [
  {
    "id": "cmcd8uemk0028v2dpjmxvcs43",
    "code": "SET",
    "name": "Set",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.996Z",
    "updatedAt": "2025-06-26T10:31:53.996Z"
  },
  {
    "id": "cmcd8ueml002av2dpp10bam40",
    "code": "PC",
    "name": "Piece",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.998Z",
    "updatedAt": "2025-06-26T10:31:53.998Z"
  },
  {
    "id": "cmcd8uemw002dv2dpvkktk6dv",
    "code": "BOX",
    "name": "Box",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 10,
    "isActive": true,
    "isBaseUnit": false,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.996Z",
    "updatedAt": "2025-06-26T10:31:53.996Z"
  },
  {
    "id": "cmcd8uemt002cv2dpgw4mw3vv",
    "code": "HR",
    "name": "Hour",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:54.006Z",
    "updatedAt": "2025-06-26T10:31:54.006Z"
  },
  {
    "id": "cmcd8uemq002bv2dphp0uqad5",
    "code": "L",
    "name": "Liter",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.999Z",
    "updatedAt": "2025-06-26T10:31:53.999Z"
  },
  {
    "id": "cmcd8uemk0029v2dpal8e0pg2",
    "code": "KG",
    "name": "Kilogram",
    "description": null,
    "symbol": null,
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-26T10:31:53.996Z",
    "updatedAt": "2025-06-26T10:31:53.996Z"
  },
  {
    "id": "cmci2x41s0000v2wdbzatmdoo",
    "code": "EACH",
    "name": "Each",
    "description": null,
    "symbol": "ea",
    "baseUnitId": null,
    "conversionFactor": 1,
    "isActive": true,
    "isBaseUnit": true,
    "createdBy": "cmcd8ue8m0003v2dpmdljcvry",
    "createdAt": "2025-06-29T19:44:53.440Z",
    "updatedAt": "2025-06-29T19:44:53.440Z"
  }
];
  for (const uom of uoms) {
    await prisma.unitOfMeasure.create({
      data: {
        ...uom,
        createdAt: new Date(uom.createdAt),
        updatedAt: new Date(uom.updatedAt)
      }
    });
  }
  
  console.log('✅ Master data seeded');
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in reverse order of dependencies
  await prisma.$transaction([
    // Clear all transactional data
    prisma.shipmentItem.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.customerPO.deleteMany(),
    prisma.salesCase.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.item.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    
    // Clear core data
    prisma.category.deleteMany(),
    prisma.unitOfMeasure.deleteMany(),
    prisma.location.deleteMany(),
    prisma.account.deleteMany(),
    prisma.taxRate.deleteMany(),
    prisma.taxCategory.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.companySettings.deleteMany(),
  ]);
  
  console.log('✅ Database cleared');
}

async function main() {
  console.log('🌱 Starting core system seed...');
  console.log('📅 Generated from database on: 2025-07-02T05:44:54.826Z');
  console.log('⚠️  This seed contains ONLY core system data');
  console.log('❌ Excludes: customers, suppliers, items, inventory, sales, and procurement data');
  
  try {
    // Clear existing data
    await clearDatabase();
    
    // Seed core system data only
    await seedChartOfAccounts();  // Create accounts first
    await seedCompanySettings();  // Then company settings that reference accounts
    await seedPermissions();
    await seedRolePermissions();
    await seedUsers();
    await seedTaxConfiguration();
    await seedLocations();
    await seedMasterData();
    
    console.log('\n✅ Core system seed completed successfully!');
    console.log('\n📊 Seeded core data summary:');
    console.log(`   - Company Settings: 1`);
    console.log(`   - Users: 6`);
    console.log(`   - Permissions: 110`);
    console.log(`   - Accounts: 56 (with zero balances)`);
    console.log(`   - Tax Categories: 2`);
    console.log(`   - Tax Rates: 2`);
    console.log(`   - Locations: 4`);
    console.log(`   - Categories: 10`);
    console.log(`   - Units of Measure: 7`);
    console.log('\n📌 Note: No business data (customers, suppliers, items, transactions) included');
    console.log('📌 All account balances reset to zero');
    console.log('📌 System is ready for fresh business data entry');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default main;
