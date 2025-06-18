# Diesel Engine Maintenance Company - Expense Categories

## Overview
This document provides a comprehensive list of expense categories specifically tailored for a diesel engine maintenance company. The expense structure is organized hierarchically to provide detailed tracking and reporting capabilities.

## Expense Account Structure

### 6000 - Operating Expenses (Parent Category)

#### 6100 - Personnel Expenses
- **6110 - Technician Salaries**: Diesel mechanics and technician wages
- **6120 - Administrative Salaries**: Office staff and management salaries
- **6130 - Overtime Wages**: Overtime payments for technical staff
- **6140 - Employee Benefits**: Health insurance, pension contributions
- **6150 - Employee Training**: Technical certifications and skill development
- **6160 - Worker Compensation Insurance**: Workplace injury insurance

#### 6200 - Facility Expenses
- **6210 - Workshop Rent**: Main workshop and service bay rental
- **6220 - Storage Facility Rent**: Parts warehouse and equipment storage
- **6230 - Facility Maintenance**: Workshop repairs and upkeep
- **6240 - Security Services**: Workshop security and monitoring
- **6250 - Waste Disposal**: Hazardous waste and oil disposal fees

#### 6300 - Utilities
- **6310 - Electricity - Workshop**: High-voltage power for equipment
- **6320 - Compressed Air Systems**: Compressed air generation and maintenance
- **6330 - Water and Sewerage**: Industrial water usage and disposal
- **6340 - Gas and Welding Gases**: Acetylene, oxygen, and other gases
- **6350 - Internet and Communications**: Internet, phone, and data services

#### 6400 - Equipment and Tools
- **6410 - Diagnostic Equipment**: Engine analyzers, scan tools, software licenses
- **6420 - Hand Tools**: Wrenches, sockets, specialty diesel tools
- **6430 - Power Tools**: Impact guns, grinders, drills
- **6440 - Lifting Equipment**: Engine hoists, jacks, crane rental
- **6450 - Welding Equipment**: Welders, torches, welding supplies
- **6460 - Tool Calibration**: Precision tool calibration services

#### 6500 - Parts and Materials
- **6510 - Engine Parts - OEM**: Original manufacturer parts
- **6520 - Engine Parts - Aftermarket**: Third-party replacement parts
- **6530 - Filters and Fluids**: Oil, fuel, air filters, coolants
- **6540 - Lubricants and Oils**: Engine oils, hydraulic fluids, greases
- **6550 - Gaskets and Seals**: Engine gaskets, O-rings, seals
- **6560 - Hardware and Fasteners**: Bolts, nuts, clamps, fittings
- **6570 - Shop Supplies**: Rags, cleaners, solvents, absorbents

#### 6600 - Vehicle and Transportation
- **6610 - Service Vehicle Fuel**: Fuel for mobile service trucks
- **6620 - Vehicle Maintenance**: Service vehicle repairs and maintenance
- **6630 - Vehicle Insurance**: Commercial vehicle insurance
- **6640 - Vehicle Registration**: License plates and permits
- **6650 - Parts Delivery**: Expedited parts shipping costs

#### 6700 - Professional Services
- **6710 - Technical Consulting**: Specialist diesel consultants
- **6720 - Legal Services**: Contract and compliance legal fees
- **6730 - Accounting Services**: Bookkeeping and tax preparation
- **6740 - Safety Compliance**: OSHA and safety consultants
- **6750 - Environmental Compliance**: EPA compliance and testing

#### 6800 - Insurance and Licenses
- **6810 - General Liability Insurance**: Business liability coverage
- **6820 - Professional Liability Insurance**: Errors and omissions coverage
- **6830 - Property Insurance**: Workshop and equipment insurance
- **6840 - Business Licenses**: Operating permits and licenses
- **6850 - Certifications**: Industry certifications and renewals

#### 6900 - Marketing and Sales
- **6910 - Advertising**: Online and print advertising
- **6920 - Website Maintenance**: Website hosting and updates
- **6930 - Trade Shows**: Industry exhibition costs
- **6940 - Customer Entertainment**: Client relationship building
- **6950 - Promotional Materials**: Brochures, business cards, uniforms

#### 7000 - Administrative Expenses
- **7010 - Office Supplies**: Paper, ink, stationery
- **7020 - Computer Software**: Office and technical software licenses
- **7030 - Bank Charges**: Banking fees and charges
- **7040 - Credit Card Fees**: Merchant service fees
- **7050 - Bad Debt Expense**: Uncollectible customer accounts

#### 7100 - Depreciation and Amortization
- **7110 - Equipment Depreciation**: Diagnostic equipment depreciation
- **7120 - Vehicle Depreciation**: Service vehicle depreciation
- **7130 - Building Improvements**: Workshop improvement amortization

#### 7200 - Other Operating Expenses
- **7210 - Equipment Rental**: Specialized equipment rental
- **7220 - Subcontractor Services**: Outsourced specialized work
- **7230 - Warranty Claims**: Warranty work costs
- **7240 - R&D Expenses**: Research and development costs
- **7250 - Miscellaneous Expenses**: Other unclassified expenses

## Sales Case Expense Categories

For tracking expenses related to specific customer jobs or sales cases:

1. **Diagnostic Services**: Engine diagnostics and analysis services
2. **Engine Parts**: Diesel engine parts and components
3. **Labor - Technician**: Regular technician labor costs
4. **Labor - Specialist**: Specialist consultant or expert labor
5. **Travel - Service Call**: Travel expenses for on-site service calls
6. **Equipment Rental**: Specialized equipment rental for repairs
7. **Subcontractor Services**: Outsourced specialized repair services
8. **Expedited Shipping**: Rush delivery for critical parts
9. **Warranty Parts**: Parts covered under warranty claims
10. **Emergency Response**: 24/7 emergency service expenses
11. **Testing & Analysis**: Oil analysis, compression testing, etc.
12. **Certification Fees**: Compliance and certification costs
13. **Environmental Disposal**: Hazardous waste and oil disposal
14. **Other**: Other miscellaneous expenses

## Key Features

### Expense Tracking Benefits
- **Detailed Cost Analysis**: Track costs by specific categories for better profitability analysis
- **Job Costing**: Link expenses to specific customer jobs/sales cases
- **Budget Management**: Set budgets at category level and monitor variances
- **Tax Compliance**: Proper categorization for tax deduction purposes
- **Financial Reporting**: Generate detailed P&L statements by expense category

### Industry-Specific Considerations
- **Environmental Compliance**: Dedicated tracking for EPA-related expenses
- **Safety Regulations**: Separate tracking for OSHA compliance costs
- **Warranty Management**: Distinguish between warranty and billable parts
- **Emergency Services**: Track premium charges for 24/7 services
- **Certification Tracking**: Monitor certification renewal costs

### Best Practices
1. **Regular Review**: Review expense categories quarterly to ensure relevance
2. **Consistent Coding**: Use consistent account codes across all transactions
3. **Documentation**: Maintain proper receipts and documentation for all expenses
4. **Approval Workflow**: Implement approval thresholds for large expenses
5. **Budget Monitoring**: Set up alerts for budget overruns

## Implementation Notes

The expense structure has been integrated into:
- Chart of Accounts (`/lib/constants/default-accounts.ts`)
- Sales Case Expense Manager (`/components/sales-cases/expense-manager.tsx`)
- Expense Service (`/lib/services/expense.service.ts`)

All expense accounts follow a hierarchical structure with parent-child relationships, enabling:
- Consolidated reporting at parent levels
- Detailed tracking at child account levels
- Flexible expansion of categories as needed