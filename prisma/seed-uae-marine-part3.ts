// Part 3 of UAE Marine Diesel seed functions

async function createSuppliers(userId: string) {
  const boschSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-001',
      name: 'Bosch Marine Middle East',
      email: 'marine@bosch-me.com',
      phone: '+971 4 338 8777',
      website: 'https://www.bosch-marine.com',
      address: 'DAFZA, Dubai, UAE',
      taxId: 'TRN100345678901234',
      currency: 'AED',
      paymentTerms: 45,
      creditLimit: 500000,
      discount: 5,
      bankName: 'Standard Chartered Bank',
      bankAccount: 'AE123456789012345678901',
      contactPerson: 'Ahmed Khalil',
      contactEmail: 'ahmed.khalil@bosch-me.com',
      contactPhone: '+971 50 123 4567',
      isActive: true,
      isPreferred: true,
      createdBy: userId
    }
  })

  const mannSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-002',
      name: 'MAN Energy Solutions UAE',
      email: 'spares@man-es.ae',
      phone: '+971 2 445 6789',
      website: 'https://www.man-es.com',
      address: 'Khalifa Port, Abu Dhabi, UAE',
      taxId: 'TRN100456789012345',
      currency: 'EUR',
      paymentTerms: 60,
      creditLimit: 750000,
      discount: 3,
      bankName: 'HSBC Middle East',
      bankAccount: 'AE234567890123456789012',
      contactPerson: 'Hans Mueller',
      contactEmail: 'hans.mueller@man-es.ae',
      contactPhone: '+971 50 234 5678',
      isActive: true,
      isPreferred: true,
      createdBy: userId
    }
  })

  const caterpillarSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-003',
      name: 'Caterpillar Marine Power Systems',
      email: 'marine.parts@cat.com',
      phone: '+971 4 299 0000',
      website: 'https://www.cat.com/marine',
      address: 'Jebel Ali, Dubai, UAE',
      taxId: 'TRN100567890123456',
      currency: 'USD',
      paymentTerms: 30,
      creditLimit: 1000000,
      discount: 7,
      bankName: 'Citibank N.A.',
      bankAccount: 'AE345678901234567890123',
      contactPerson: 'Sarah Johnson',
      contactEmail: 'sarah.johnson@cat.com',
      contactPhone: '+971 50 345 6789',
      isActive: true,
      isPreferred: true,
      createdBy: userId
    }
  })

  const fleetguardSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-004',
      name: 'Fleetguard Filters Gulf',
      email: 'orders@fleetguard-gulf.com',
      phone: '+971 4 883 1100',
      website: 'https://www.fleetguard.com',
      address: 'Al Quoz Industrial, Dubai, UAE',
      taxId: 'TRN100678901234567',
      currency: 'AED',
      paymentTerms: 30,
      creditLimit: 200000,
      discount: 10,
      bankName: 'Emirates NBD',
      bankAccount: 'AE456789012345678901234',
      contactPerson: 'Rashid Al Maktoum',
      contactEmail: 'rashid@fleetguard-gulf.com',
      contactPhone: '+971 50 456 7890',
      isActive: true,
      createdBy: userId
    }
  })

  const shellSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-005',
      name: 'Shell Marine Lubricants',
      email: 'marine.lubricants@shell.com',
      phone: '+971 4 332 1234',
      website: 'https://www.shell.com/marine',
      address: 'Dubai Investment Park, Dubai, UAE',
      taxId: 'TRN100789012345678',
      currency: 'AED',
      paymentTerms: 45,
      creditLimit: 300000,
      discount: 8,
      bankName: 'Abu Dhabi Commercial Bank',
      bankAccount: 'AE567890123456789012345',
      contactPerson: 'Maria Santos',
      contactEmail: 'maria.santos@shell.com',
      contactPhone: '+971 50 567 8901',
      isActive: true,
      createdBy: userId
    }
  })

  return { boschSupplier, mannSupplier, caterpillarSupplier, fleetguardSupplier, shellSupplier }
}

async function createCustomers(adminId: string, salesId: string) {
  const dpWorld = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-001',
      name: 'DP World Jebel Ali',
      taxId: 'TRN100111222333001',
      email: 'marine.procurement@dpworld.com',
      phone: '+971 4 881 5000',
      website: 'https://www.dpworld.com',
      industry: 'Ports & Logistics',
      address: 'Jebel Ali Port, Dubai, UAE',
      currency: 'AED',
      creditLimit: 2000000,
      paymentTerms: 60,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: adminId
    }
  })

  const adnoc = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      name: 'ADNOC Logistics & Services',
      taxId: 'TRN100222333444001',
      email: 'marine.services@adnoc.ae',
      phone: '+971 2 606 0000',
      website: 'https://www.adnoc.ae',
      industry: 'Oil & Gas',
      address: 'Corniche Road, Abu Dhabi, UAE',
      currency: 'AED',
      creditLimit: 5000000,
      paymentTerms: 90,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: adminId
    }
  })

  const emiratesShipping = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      name: 'Emirates Shipping Line',
      taxId: 'TRN100333444555001',
      email: 'technical@emiratesline.com',
      phone: '+971 4 332 4400',
      website: 'https://www.emiratesline.com',
      industry: 'Shipping',
      address: 'Dubai Maritime City, Dubai, UAE',
      currency: 'AED',
      creditLimit: 1500000,
      paymentTerms: 45,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: adminId
    }
  })

  const gulftainer = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-004',
      name: 'Gulftainer',
      taxId: 'TRN100444555666001',
      email: 'maintenance@gulftainer.com',
      phone: '+971 6 502 9999',
      website: 'https://www.gulftainer.com',
      industry: 'Ports & Logistics',
      address: 'Khorfakkan Container Terminal, Sharjah, UAE',
      currency: 'AED',
      creditLimit: 1000000,
      paymentTerms: 30,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: salesId
    }
  })

  const topazEnergy = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-005',
      name: 'Topaz Energy and Marine',
      taxId: 'TRN100555666777001',
      email: 'fleet.maintenance@topaz.ae',
      phone: '+971 4 440 3100',
      website: 'https://www.topaz.ae',
      industry: 'Marine Services',
      address: 'Dubai Investment Park 2, Dubai, UAE',
      currency: 'USD',
      creditLimit: 3000000,
      paymentTerms: 60,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: salesId
    }
  })

  const nationalMarine = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-006',
      name: 'National Marine Dredging Company',
      taxId: 'TRN100666777888001',
      email: 'procurement@nmdc.ae',
      phone: '+971 2 513 0000',
      website: 'https://www.nmdc.com',
      industry: 'Marine Construction',
      address: 'Mussafah Industrial Area, Abu Dhabi, UAE',
      currency: 'AED',
      creditLimit: 2500000,
      paymentTerms: 75,
      assignedToId: salesId,
      assignedBy: adminId,
      createdBy: salesId
    }
  })

  return { dpWorld, adnoc, emiratesShipping, gulftainer, topazEnergy, nationalMarine }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'Khalid',
        lastName: 'Al Rashid',
        company: 'Sharjah Ports Authority',
        email: 'khalid.rashid@sharjahports.ae',
        phone: '+971 50 111 2222',
        jobTitle: 'Marine Operations Manager',
        status: LeadStatus.NEW,
        source: LeadSource.REFERRAL,
        notes: 'Referred by DP World. Looking for maintenance partner for tugboat fleet',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'James',
        lastName: 'Wilson',
        company: 'RAK Maritime',
        email: 'j.wilson@rakmaritime.com',
        phone: '+971 50 333 4444',
        jobTitle: 'Technical Director',
        status: LeadStatus.CONTACTED,
        source: LeadSource.TRADE_SHOW,
        notes: 'Met at Seatrade Maritime Middle East 2024',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Fatima',
        lastName: 'Al Zaabi',
        company: 'Fujairah Oil Terminal',
        email: 'fatima.alzaabi@fot.ae',
        phone: '+971 50 555 6666',
        jobTitle: 'Procurement Manager',
        status: LeadStatus.QUALIFIED,
        source: LeadSource.WEBSITE,
        notes: 'Downloaded marine engine maintenance guide. Interested in annual contracts',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Antonio',
        lastName: 'Silva',
        company: 'Arabian Marine Services',
        email: 'antonio@arabianmarine.ae',
        phone: '+971 50 777 8888',
        jobTitle: 'Fleet Manager',
        status: LeadStatus.NEW,
        source: LeadSource.COLD_CALL,
        notes: 'Manages 15 support vessels. Current provider contract ending in 3 months',
        createdBy: salesId
      }
    })
  ])

  return leads
}

async function createSalesTeam(users: any) {
  await prisma.salesTeamMember.create({
    data: {
      userId: users.sales.id,
      salesTarget: 5000000, // AED 5M annual target
      commission: 2.5, // 2.5% commission
      territory: 'Dubai & Northern Emirates',
      specialization: 'Key Accounts',
      teamName: 'Marine Sales',
      isTeamLead: true
    }
  })

  await prisma.salesTeamMember.create({
    data: {
      userId: users.salesExec.id,
      salesTarget: 3000000, // AED 3M annual target
      commission: 2.0, // 2% commission
      territory: 'Abu Dhabi & Al Ain',
      specialization: 'New Business Development',
      teamName: 'Marine Sales',
      isTeamLead: false
    }
  })
}

async function createSalesCases(salesId: string, customers: any, leads: any) {
  const dpWorldCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-001',
      customerId: customers.dpWorld.id,
      title: 'Annual Maintenance Contract - Tugboat Fleet',
      description: 'Comprehensive maintenance agreement for 12 tugboats including scheduled services and emergency support',
      status: SalesCaseStatus.IN_PROGRESS,
      estimatedValue: 2400000, // AED 2.4M
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  const adnocCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-002',
      customerId: customers.adnoc.id,
      title: 'Offshore Support Vessel Engine Overhaul',
      description: 'Major overhaul of 6 OSV main engines and generators',
      status: SalesCaseStatus.PROPOSAL,
      estimatedValue: 3600000, // AED 3.6M
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  const emiratesShippingCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-003',
      customerId: customers.emiratesShipping.id,
      title: 'Emergency Repair Services Contract',
      description: '24/7 emergency repair coverage for container vessel fleet',
      status: SalesCaseStatus.NEGOTIATION,
      estimatedValue: 1800000, // AED 1.8M
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  const topazCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-004',
      customerId: customers.topazEnergy.id,
      title: 'Spare Parts Supply Agreement',
      description: 'Framework agreement for marine engine spare parts supply',
      status: SalesCaseStatus.IN_PROGRESS,
      estimatedValue: 950000, // AED 950K
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  return { dpWorldCase, adnocCase, emiratesShippingCase, topazCase }
}

export {
  createSuppliers,
  createCustomers,
  createLeads,
  createSalesTeam,
  createSalesCases
}