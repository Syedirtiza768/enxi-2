/**
 * Centralized service mocking utilities for tests
 */

// Mock all services that are commonly used
export const mockChartOfAccountsService = () => ({
  createAccount: jest.fn().mockResolvedValue({
    id: 'mock-account-id',
    code: 'MOCK-001',
    name: 'Mock Account',
    type: 'ASSET'
  }),
  getAccountById: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
  getAllAccounts: jest.fn().mockResolvedValue([]),
  getAccountByCode: jest.fn(),
  getAccountsByType: jest.fn().mockResolvedValue([]),
  generateAccountCode: jest.fn().mockReturnValue('MOCK-001')
});

export const mockAuditService = () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn().mockResolvedValue([]),
  getAuditLogById: jest.fn()
});

export const mockAuthService = () => ({
  validateUser: jest.fn(),
  generateToken: jest.fn().mockReturnValue('mock-token'),
  verifyToken: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  createUser: jest.fn(),
  getUserById: jest.fn()
});

export const mockCurrencyService = () => ({
  getExchangeRate: jest.fn().mockResolvedValue(1),
  convertAmount: jest.fn().mockImplementation((amount) => amount),
  getActiveRates: jest.fn().mockResolvedValue([]),
  updateExchangeRate: jest.fn()
});

export const mockInventoryService = () => ({
  createItem: jest.fn(),
  updateItem: jest.fn(),
  getItemById: jest.fn(),
  getAllItems: jest.fn().mockResolvedValue([]),
  checkStock: jest.fn().mockResolvedValue(true),
  updateStock: jest.fn()
});

export const mockEmailService = () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendQuotationEmail: jest.fn().mockResolvedValue(true),
  sendInvoiceEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
});

// Setup all service mocks
export const setupServiceMocks = () => {
  // Mock ChartOfAccountsService
  jest.mock('@/lib/services/accounting/chart-of-accounts.service', () => ({
    ChartOfAccountsService: jest.fn().mockImplementation(() => mockChartOfAccountsService())
  }));

  // Mock AuditService
  jest.mock('@/lib/services/audit.service', () => ({
    AuditService: jest.fn().mockImplementation(() => mockAuditService())
  }));

  // Mock AuthService
  jest.mock('@/lib/services/auth.service', () => ({
    AuthService: jest.fn().mockImplementation(() => mockAuthService())
  }));

  // Mock CurrencyService
  jest.mock('@/lib/services/accounting/currency.service', () => ({
    CurrencyService: jest.fn().mockImplementation(() => mockCurrencyService())
  }));

  // Mock InventoryService
  jest.mock('@/lib/services/inventory.service', () => ({
    InventoryService: jest.fn().mockImplementation(() => mockInventoryService())
  }));

  // Mock EmailService
  jest.mock('@/lib/services/email.service', () => ({
    EmailService: jest.fn().mockImplementation(() => mockEmailService())
  }));
};

// Helper to reset all mocks
export const resetAllServiceMocks = () => {
  jest.clearAllMocks();
};