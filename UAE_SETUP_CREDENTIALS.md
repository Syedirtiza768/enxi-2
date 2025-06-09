# UAE Diesel Engine Maintenance Company - Setup & Credentials

## Default Login Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `DieselUAE2024!`
- **Email:** admin@dieseluae.com
- **Name:** Ahmed Al Rashid
- **Role:** Administrator (full access)

### Sales Manager
- **Username:** `sales_manager`
- **Password:** `DieselUAE2024!`
- **Email:** sales@dieseluae.com
- **Name:** Mohammed Al Maktoum
- **Role:** Sales Manager

### Service Technician
- **Username:** `service_tech`
- **Password:** `DieselUAE2024!`
- **Email:** service@dieseluae.com
- **Name:** Khalid Al Nahyan
- **Role:** Service Technician

### Accountant
- **Username:** `accountant`
- **Password:** `DieselUAE2024!`
- **Email:** accounts@dieseluae.com
- **Name:** Fatima Al Qassimi
- **Role:** Accountant

### Warehouse Manager
- **Username:** `warehouse`
- **Password:** `DieselUAE2024!`
- **Email:** warehouse@dieseluae.com
- **Name:** Omar Al Sharqi
- **Role:** Warehouse Manager

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Syedirtiza768/enxi-2.git
cd enxi-2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
# Copy the example environment file
cp .env.example .env

# Or create a new .env file with:
cat > .env << EOL
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
EOL
```

### 4. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed with UAE data
npm run seed:uae
```

### 5. Run the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## Company Profile (Seeded Data)

### Business Information
- **Company Type:** Diesel Engine Maintenance & Repair
- **Location:** UAE (Dubai, Abu Dhabi, Sharjah, RAK)
- **Currency:** AED (UAE Dirham)
- **VAT Rate:** 5%

### Pre-loaded Customers
1. **DP World - Jebel Ali** (Port operations)
2. **Emirates Transport** (Fleet management)
3. **ADNOC Distribution** (Oil & Gas)
4. **RAK Cement Company** (Manufacturing)

### Pre-loaded Suppliers
1. **Cummins Arabia FZE** (Engine parts)
2. **Al-Bahar (Caterpillar)** (CAT parts)
3. **ENOC Lubricants** (Oils & fluids)

### Inventory Categories
- **Engine Components**
  - Filters (Oil, Fuel, Air)
  - Piston & Connecting Rod Parts
- **Lubricants & Fluids**
  - Engine Oils
  - Coolants
- **Services**
  - Preventive Maintenance
  - Engine Overhaul
  - Emergency Repairs

### Sample Items (with AED pricing)
- Oil Filter (Cummins): 120 AED
- Fuel Filter (CAT): 180 AED
- Piston Kit: 3,850 AED
- Engine Oil (20L): 385 AED
- Preventive Maintenance: 1,200 AED/service
- Engine Overhaul: 35,000 AED
- Emergency Repair: 500 AED/hour

### Chart of Accounts (UAE Specific)
- **Assets**
  - Cash - AED
  - Emirates NBD - Current Account
  - Accounts Receivable
  - Inventory - Spare Parts
  - Service Equipment & Tools
- **Liabilities**
  - Accounts Payable
  - VAT Payable (5%)
- **Income**
  - Service Revenue
  - Parts Sales Revenue
- **Expenses**
  - Cost of Parts Sold
  - Technical Staff Salaries
  - Workshop Rent

## Quick Start Commands

```bash
# Full setup in one command (Ubuntu/Linux)
git clone https://github.com/Syedirtiza768/enxi-2.git && \
cd enxi-2 && \
npm install && \
cp .env.example .env && \
npx prisma generate && \
npx prisma db push && \
npm run seed:uae && \
npm run dev
```

## Access the Application

After setup, access the application at:
- **Development:** http://localhost:3000
- **Production:** Configure your domain

Login with any of the credentials above to start using the system.

## Support

For issues or questions:
- Check the logs in the console
- Review the `.env` file configuration
- Ensure all dependencies are installed
- Database file should be at `prisma/dev.db`