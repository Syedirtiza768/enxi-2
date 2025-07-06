# ERP Overview

Enxi ERP delivers a unified platform that streamlines sales, purchasing, inventory and accounting in a single Next.js application. Built with a service layer architecture and a PostgreSQL-ready database, it gives organizations real-time visibility across operations while maintaining a concise footprint.

## Value Proposition
- **Unified Workflow**: Manage leads, sales orders, procurement, and financials without jumping between systems.
- **Secure by Design**: JWT authentication, role-based access control, and audit trails protect sensitive data.
- **Scalable Architecture**: Modular services and Prisma ORM make it easy to extend or integrate new modules.
- **Fast Implementation**: Monolithic deployment reduces infrastructure complexity while still enabling future microservice splits.

## Core Features
- Sales & CRM with lead conversion and quotation management
- Procurement and three-way matching
- Inventory with multi-location tracking and FIFO costing
- Double-entry accounting with multi-currency support

## Key Differentiators
- **Modern Tech Stack**: React 19, TypeScript, and Prisma enable rapid feature delivery and long-term maintainability.
- **Consistent API Layer**: All data access goes through validated service methods, simplifying integration with external systems.
- **Deployment Flexibility**: Runs smoothly on a single server or can be containerized for cloud environments.

## Architecture Snapshot
```
+-----------+       HTTPS        +--------------------+
|  Browser  +------------------->+ Next.js Application |
+-----------+                    | (UI & API)         |
                                  +---------+----------+
                                            |
                                    +-------v-------+
                                    |  Service      |
                                    |  Layer        |
                                    +-------+-------+
                                            |
                                    +-------v-------+
                                    |  Prisma ORM   |
                                    +-------+-------+
                                            |
                                    +-------v-------+
                                    |  Database     |
                                    +---------------+
```
