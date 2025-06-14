#!/usr/bin/env npx tsx

import { PrismaClient, Role } from '../lib/generated/prisma';

const prisma = new PrismaClient();

// Define all permissions with their modules and actions
const permissions = [
  // User Management
  { code: 'users.create', name: 'Create Users', module: 'users', action: 'create', description: 'Create new users' },
  { code: 'users.read', name: 'View Users', module: 'users', action: 'read', description: 'View user details' },
  { code: 'users.update', name: 'Update Users', module: 'users', action: 'update', description: 'Update user information' },
  { code: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete', description: 'Delete users' },
  { code: 'users.manage_roles', name: 'Manage User Roles', module: 'users', action: 'manage_roles', description: 'Assign and manage user roles' },
  { code: 'users.manage_permissions', name: 'Manage User Permissions', module: 'users', action: 'manage_permissions', description: 'Manage user-specific permissions' },
  
  // Sales Team Management
  { code: 'sales_team.create', name: 'Create Sales Team Members', module: 'sales_team', action: 'create', description: 'Add new sales team members' },
  { code: 'sales_team.read', name: 'View Sales Team', module: 'sales_team', action: 'read', description: 'View sales team information' },
  { code: 'sales_team.update', name: 'Update Sales Team', module: 'sales_team', action: 'update', description: 'Update sales team details' },
  { code: 'sales_team.delete', name: 'Delete Sales Team Members', module: 'sales_team', action: 'delete', description: 'Remove sales team members' },
  { code: 'sales_team.assign', name: 'Assign Sales Team', module: 'sales_team', action: 'assign', description: 'Assign customers and leads to sales reps' },
  { code: 'sales_team.view_all', name: 'View All Sales Teams', module: 'sales_team', action: 'view_all', description: 'View all sales team members across organization' },
  
  // Sales Cases
  { code: 'sales_cases.create', name: 'Create Sales Cases', module: 'sales_cases', action: 'create', description: 'Create new sales cases' },
  { code: 'sales_cases.read', name: 'View Sales Cases', module: 'sales_cases', action: 'read', description: 'View sales case details' },
  { code: 'sales_cases.update', name: 'Update Sales Cases', module: 'sales_cases', action: 'update', description: 'Update sales case information' },
  { code: 'sales_cases.delete', name: 'Delete Sales Cases', module: 'sales_cases', action: 'delete', description: 'Delete sales cases' },
  { code: 'sales_cases.close', name: 'Close Sales Cases', module: 'sales_cases', action: 'close', description: 'Close and finalize sales cases' },
  { code: 'sales_cases.view_all', name: 'View All Sales Cases', module: 'sales_cases', action: 'view_all', description: 'View all sales cases across organization' },
  { code: 'sales_cases.view_team', name: 'View Team Sales Cases', module: 'sales_cases', action: 'view_team', description: 'View sales cases of team members' },
  { code: 'sales_cases.manage_expenses', name: 'Manage Case Expenses', module: 'sales_cases', action: 'manage_expenses', description: 'Add and manage sales case expenses' },
  
  // Leads
  { code: 'leads.create', name: 'Create Leads', module: 'leads', action: 'create', description: 'Create new leads' },
  { code: 'leads.read', name: 'View Leads', module: 'leads', action: 'read', description: 'View lead details' },
  { code: 'leads.update', name: 'Update Leads', module: 'leads', action: 'update', description: 'Update lead information' },
  { code: 'leads.delete', name: 'Delete Leads', module: 'leads', action: 'delete', description: 'Delete leads' },
  { code: 'leads.convert', name: 'Convert Leads', module: 'leads', action: 'convert', description: 'Convert leads to customers' },
  { code: 'leads.view_all', name: 'View All Leads', module: 'leads', action: 'view_all', description: 'View all leads across organization' },
  
  // Customers
  { code: 'customers.create', name: 'Create Customers', module: 'customers', action: 'create', description: 'Create new customers' },
  { code: 'customers.read', name: 'View Customers', module: 'customers', action: 'read', description: 'View customer details' },
  { code: 'customers.update', name: 'Update Customers', module: 'customers', action: 'update', description: 'Update customer information' },
  { code: 'customers.delete', name: 'Delete Customers', module: 'customers', action: 'delete', description: 'Delete customers' },
  { code: 'customers.manage_credit', name: 'Manage Customer Credit', module: 'customers', action: 'manage_credit', description: 'Manage customer credit limits and terms' },
  { code: 'customers.view_all', name: 'View All Customers', module: 'customers', action: 'view_all', description: 'View all customers across organization' },
  
  // Quotations
  { code: 'quotations.create', name: 'Create Quotations', module: 'quotations', action: 'create', description: 'Create new quotations' },
  { code: 'quotations.read', name: 'View Quotations', module: 'quotations', action: 'read', description: 'View quotation details' },
  { code: 'quotations.update', name: 'Update Quotations', module: 'quotations', action: 'update', description: 'Update quotation information' },
  { code: 'quotations.delete', name: 'Delete Quotations', module: 'quotations', action: 'delete', description: 'Delete quotations' },
  { code: 'quotations.approve', name: 'Approve Quotations', module: 'quotations', action: 'approve', description: 'Approve quotations for sending' },
  { code: 'quotations.send', name: 'Send Quotations', module: 'quotations', action: 'send', description: 'Send quotations to customers' },
  { code: 'quotations.convert', name: 'Convert Quotations', module: 'quotations', action: 'convert', description: 'Convert quotations to sales orders' },
  { code: 'quotations.view_all', name: 'View All Quotations', module: 'quotations', action: 'view_all', description: 'View all quotations across organization' },
  
  // Sales Orders
  { code: 'sales_orders.create', name: 'Create Sales Orders', module: 'sales_orders', action: 'create', description: 'Create new sales orders' },
  { code: 'sales_orders.read', name: 'View Sales Orders', module: 'sales_orders', action: 'read', description: 'View sales order details' },
  { code: 'sales_orders.update', name: 'Update Sales Orders', module: 'sales_orders', action: 'update', description: 'Update sales order information' },
  { code: 'sales_orders.delete', name: 'Delete Sales Orders', module: 'sales_orders', action: 'delete', description: 'Delete sales orders' },
  { code: 'sales_orders.approve', name: 'Approve Sales Orders', module: 'sales_orders', action: 'approve', description: 'Approve sales orders' },
  { code: 'sales_orders.cancel', name: 'Cancel Sales Orders', module: 'sales_orders', action: 'cancel', description: 'Cancel sales orders' },
  { code: 'sales_orders.view_all', name: 'View All Sales Orders', module: 'sales_orders', action: 'view_all', description: 'View all sales orders across organization' },
  
  // Inventory Management
  { code: 'inventory.create', name: 'Create Inventory Items', module: 'inventory', action: 'create', description: 'Create new inventory items' },
  { code: 'inventory.read', name: 'View Inventory', module: 'inventory', action: 'read', description: 'View inventory details' },
  { code: 'inventory.update', name: 'Update Inventory', module: 'inventory', action: 'update', description: 'Update inventory information' },
  { code: 'inventory.delete', name: 'Delete Inventory Items', module: 'inventory', action: 'delete', description: 'Delete inventory items' },
  { code: 'inventory.adjust', name: 'Adjust Inventory', module: 'inventory', action: 'adjust', description: 'Make inventory adjustments' },
  { code: 'inventory.transfer', name: 'Transfer Inventory', module: 'inventory', action: 'transfer', description: 'Transfer inventory between locations' },
  { code: 'inventory.count', name: 'Count Inventory', module: 'inventory', action: 'count', description: 'Perform physical inventory counts' },
  { code: 'inventory.view_costs', name: 'View Inventory Costs', module: 'inventory', action: 'view_costs', description: 'View inventory cost information' },
  { code: 'inventory.manage_categories', name: 'Manage Categories', module: 'inventory', action: 'manage_categories', description: 'Manage inventory categories' },
  
  // Shipments
  { code: 'shipments.create', name: 'Create Shipments', module: 'shipments', action: 'create', description: 'Create new shipments' },
  { code: 'shipments.read', name: 'View Shipments', module: 'shipments', action: 'read', description: 'View shipment details' },
  { code: 'shipments.update', name: 'Update Shipments', module: 'shipments', action: 'update', description: 'Update shipment information' },
  { code: 'shipments.delete', name: 'Delete Shipments', module: 'shipments', action: 'delete', description: 'Delete shipments' },
  { code: 'shipments.confirm', name: 'Confirm Shipments', module: 'shipments', action: 'confirm', description: 'Confirm shipments' },
  { code: 'shipments.deliver', name: 'Mark as Delivered', module: 'shipments', action: 'deliver', description: 'Mark shipments as delivered' },
  { code: 'shipments.view_all', name: 'View All Shipments', module: 'shipments', action: 'view_all', description: 'View all shipments across organization' },
  
  // Accounting
  { code: 'accounting.create_journal', name: 'Create Journal Entries', module: 'accounting', action: 'create_journal', description: 'Create journal entries' },
  { code: 'accounting.post_journal', name: 'Post Journal Entries', module: 'accounting', action: 'post_journal', description: 'Post journal entries' },
  { code: 'accounting.view_journals', name: 'View Journal Entries', module: 'accounting', action: 'view_journals', description: 'View journal entries' },
  { code: 'accounting.manage_accounts', name: 'Manage Chart of Accounts', module: 'accounting', action: 'manage_accounts', description: 'Manage chart of accounts' },
  { code: 'accounting.view_reports', name: 'View Financial Reports', module: 'accounting', action: 'view_reports', description: 'View financial reports' },
  { code: 'accounting.close_period', name: 'Close Accounting Period', module: 'accounting', action: 'close_period', description: 'Close accounting periods' },
  { code: 'accounting.view_all', name: 'View All Accounting', module: 'accounting', action: 'view_all', description: 'Full access to accounting module' },
  
  // Invoices
  { code: 'invoices.create', name: 'Create Invoices', module: 'invoices', action: 'create', description: 'Create new invoices' },
  { code: 'invoices.read', name: 'View Invoices', module: 'invoices', action: 'read', description: 'View invoice details' },
  { code: 'invoices.update', name: 'Update Invoices', module: 'invoices', action: 'update', description: 'Update invoice information' },
  { code: 'invoices.delete', name: 'Delete Invoices', module: 'invoices', action: 'delete', description: 'Delete invoices' },
  { code: 'invoices.send', name: 'Send Invoices', module: 'invoices', action: 'send', description: 'Send invoices to customers' },
  { code: 'invoices.void', name: 'Void Invoices', module: 'invoices', action: 'void', description: 'Void invoices' },
  { code: 'invoices.view_all', name: 'View All Invoices', module: 'invoices', action: 'view_all', description: 'View all invoices across organization' },
  
  // Payments
  { code: 'payments.create', name: 'Record Payments', module: 'payments', action: 'create', description: 'Record customer payments' },
  { code: 'payments.read', name: 'View Payments', module: 'payments', action: 'read', description: 'View payment details' },
  { code: 'payments.update', name: 'Update Payments', module: 'payments', action: 'update', description: 'Update payment information' },
  { code: 'payments.delete', name: 'Delete Payments', module: 'payments', action: 'delete', description: 'Delete payment records' },
  { code: 'payments.refund', name: 'Process Refunds', module: 'payments', action: 'refund', description: 'Process payment refunds' },
  { code: 'payments.view_all', name: 'View All Payments', module: 'payments', action: 'view_all', description: 'View all payments across organization' },
  
  // Purchase Orders
  { code: 'purchase_orders.create', name: 'Create Purchase Orders', module: 'purchase_orders', action: 'create', description: 'Create new purchase orders' },
  { code: 'purchase_orders.read', name: 'View Purchase Orders', module: 'purchase_orders', action: 'read', description: 'View purchase order details' },
  { code: 'purchase_orders.update', name: 'Update Purchase Orders', module: 'purchase_orders', action: 'update', description: 'Update purchase order information' },
  { code: 'purchase_orders.delete', name: 'Delete Purchase Orders', module: 'purchase_orders', action: 'delete', description: 'Delete purchase orders' },
  { code: 'purchase_orders.approve', name: 'Approve Purchase Orders', module: 'purchase_orders', action: 'approve', description: 'Approve purchase orders' },
  { code: 'purchase_orders.receive', name: 'Receive Goods', module: 'purchase_orders', action: 'receive', description: 'Receive goods against purchase orders' },
  { code: 'purchase_orders.view_all', name: 'View All Purchase Orders', module: 'purchase_orders', action: 'view_all', description: 'View all purchase orders' },
  
  // System Administration
  { code: 'system.view_logs', name: 'View System Logs', module: 'system', action: 'view_logs', description: 'View system and audit logs' },
  { code: 'system.manage_settings', name: 'Manage System Settings', module: 'system', action: 'manage_settings', description: 'Manage system configuration' },
  { code: 'system.backup', name: 'Backup System', module: 'system', action: 'backup', description: 'Perform system backups' },
  { code: 'system.restore', name: 'Restore System', module: 'system', action: 'restore', description: 'Restore system from backup' },
  { code: 'system.health_check', name: 'View System Health', module: 'system', action: 'health_check', description: 'View system health and performance' },
  { code: 'system.manage_integrations', name: 'Manage Integrations', module: 'system', action: 'manage_integrations', description: 'Manage third-party integrations' },
  
  // Reports
  { code: 'reports.sales', name: 'View Sales Reports', module: 'reports', action: 'sales', description: 'View sales analytics and reports' },
  { code: 'reports.financial', name: 'View Financial Reports', module: 'reports', action: 'financial', description: 'View financial reports' },
  { code: 'reports.inventory', name: 'View Inventory Reports', module: 'reports', action: 'inventory', description: 'View inventory reports' },
  { code: 'reports.customer', name: 'View Customer Reports', module: 'reports', action: 'customer', description: 'View customer analytics' },
  { code: 'reports.export', name: 'Export Reports', module: 'reports', action: 'export', description: 'Export reports to various formats' },
  { code: 'reports.custom', name: 'Create Custom Reports', module: 'reports', action: 'custom', description: 'Create and manage custom reports' },
];

// Define role-permission mappings
const rolePermissions: Record<Role, string[]> = {
  SUPER_ADMIN: permissions.map(p => p.code), // All permissions
  
  ADMIN: permissions
    .filter(p => !p.code.startsWith('system.') || p.code === 'system.view_logs' || p.code === 'system.health_check')
    .map(p => p.code),
  
  MANAGER: [
    // Sales team management
    'sales_team.read', 'sales_team.update', 'sales_team.assign', 'sales_team.view_all',
    // Sales cases - full access for team
    'sales_cases.create', 'sales_cases.read', 'sales_cases.update', 'sales_cases.close', 
    'sales_cases.view_team', 'sales_cases.manage_expenses',
    // Leads - full access
    'leads.create', 'leads.read', 'leads.update', 'leads.convert', 'leads.view_all',
    // Customers - full access
    'customers.create', 'customers.read', 'customers.update', 'customers.manage_credit', 'customers.view_all',
    // Quotations - full access
    'quotations.create', 'quotations.read', 'quotations.update', 'quotations.approve', 
    'quotations.send', 'quotations.convert', 'quotations.view_all',
    // Sales orders - full access
    'sales_orders.create', 'sales_orders.read', 'sales_orders.update', 'sales_orders.approve', 
    'sales_orders.cancel', 'sales_orders.view_all',
    // Inventory - read only
    'inventory.read',
    // Shipments - read and update
    'shipments.read', 'shipments.update', 'shipments.view_all',
    // Invoices - view
    'invoices.read', 'invoices.view_all',
    // Payments - view
    'payments.read', 'payments.view_all',
    // Reports
    'reports.sales', 'reports.customer', 'reports.export',
  ],
  
  SALES_REP: [
    // Sales team - read only
    'sales_team.read',
    // Sales cases - own records only
    'sales_cases.create', 'sales_cases.read', 'sales_cases.update',
    // Leads - own records
    'leads.create', 'leads.read', 'leads.update', 'leads.convert',
    // Customers - assigned only
    'customers.read', 'customers.update',
    // Quotations - own records
    'quotations.create', 'quotations.read', 'quotations.update', 'quotations.send',
    // Sales orders - read own
    'sales_orders.read',
    // Inventory - read only
    'inventory.read',
    // Shipments - read own
    'shipments.read',
    // Invoices - read own
    'invoices.read',
    // Reports - limited
    'reports.sales',
  ],
  
  ACCOUNTANT: [
    // Full accounting access
    'accounting.create_journal', 'accounting.post_journal', 'accounting.view_journals',
    'accounting.manage_accounts', 'accounting.view_reports', 'accounting.close_period', 'accounting.view_all',
    // Invoices - full access
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send', 
    'invoices.void', 'invoices.view_all',
    // Payments - full access
    'payments.create', 'payments.read', 'payments.update', 'payments.refund', 'payments.view_all',
    // Purchase orders - financial aspects
    'purchase_orders.read', 'purchase_orders.view_all',
    // Sales orders - read for invoicing
    'sales_orders.read', 'sales_orders.view_all',
    // Customers - read for AR
    'customers.read', 'customers.manage_credit', 'customers.view_all',
    // Inventory - read for costing
    'inventory.read', 'inventory.view_costs',
    // Reports - financial
    'reports.financial', 'reports.export', 'reports.custom',
  ],
  
  WAREHOUSE: [
    // Inventory - full access
    'inventory.create', 'inventory.read', 'inventory.update', 'inventory.adjust',
    'inventory.transfer', 'inventory.count', 'inventory.view_costs', 'inventory.manage_categories',
    // Shipments - full access
    'shipments.create', 'shipments.read', 'shipments.update', 'shipments.confirm',
    'shipments.deliver', 'shipments.view_all',
    // Purchase orders - receiving
    'purchase_orders.read', 'purchase_orders.receive', 'purchase_orders.view_all',
    // Sales orders - read for fulfillment
    'sales_orders.read', 'sales_orders.view_all',
    // Reports - inventory
    'reports.inventory', 'reports.export',
  ],
  
  VIEWER: [
    // Read-only access to most modules
    'users.read',
    'sales_team.read',
    'sales_cases.read',
    'leads.read',
    'customers.read',
    'quotations.read',
    'sales_orders.read',
    'inventory.read',
    'shipments.read',
    'invoices.read',
    'payments.read',
    'purchase_orders.read',
    'reports.sales',
    'reports.inventory',
    'reports.customer',
  ],
  
  USER: [], // Deprecated role - no permissions
};

async function seedPermissions(): Promise<void> {
  try {
    console.warn('🌱 Starting permissions seeding...\n');

    // Step 1: Create all permissions
    console.warn('📝 Creating permissions...');
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          name: permission.name,
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
        create: permission,
      });
      console.warn(`  ✅ Created/Updated permission: ${permission.code}`);
    }
    console.warn(`\n✅ Created ${permissions.length} permissions\n`);

    // Step 2: Assign permissions to roles
    console.warn('🔐 Assigning permissions to roles...');
    for (const [role, permissionCodes] of Object.entries(rolePermissions)) {
      // Delete existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { role: role as Role },
      });

      // Create new role permissions
      for (const permissionCode of permissionCodes) {
        const permission = await prisma.permission.findUnique({
          where: { code: permissionCode },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              role: role as Role,
              permissionId: permission.id,
            },
          });
        }
      }
      console.warn(`  ✅ Assigned ${permissionCodes.length} permissions to role: ${role}`);
    }

    // Step 3: Grant direct permissions to super admin user
    console.warn('\n👤 Granting direct permissions to super admin user...');
    const superAdminUser = await prisma.user.findFirst({
      where: { 
        role: 'SUPER_ADMIN',
        username: 'super-admin',
      },
    });

    if (superAdminUser) {
      // Grant all system permissions directly to super admin
      const systemPermissions = await prisma.permission.findMany({
        where: { module: 'system' },
      });

      for (const permission of systemPermissions) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: superAdminUser.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            userId: superAdminUser.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.warn(`  ✅ Granted ${systemPermissions.length} system permissions directly to super admin`);
    } else {
      console.warn('  ⚠️  Super admin user not found - skipping direct permissions');
    }

    // Step 4: Display summary
    console.warn('\n📊 Permission Summary:');
    console.warn('─'.repeat(50));
    
    const modules = [...new Set(permissions.map(p => p.module))];
    for (const module of modules) {
      const modulePerms = permissions.filter(p => p.module === module);
      console.warn(`\n${module.toUpperCase()}:`);
      for (const perm of modulePerms) {
        console.warn(`  - ${perm.name} (${perm.code})`);
      }
    }

    console.warn('\n🎉 Permissions seeding completed successfully!');
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect();
    }
}

// Run the seeding
seedPermissions()
  .catch((error) => {
    console.error('Failed to seed permissions:', error);
    process.exit(1);
  });