import { prisma } from '@/lib/db/prisma';

async function updateCompanyLogo() {
  try {
    console.log('Updating company logo...');
    
    // Use the existing logo from public folder
    const logoUrl = '/logo.png';
    
    // Update company settings
    const settings = await prisma.companySettings.findFirst({
      where: { isActive: true }
    });
    
    if (!settings) {
      console.error('No active company settings found');
      return;
    }
    
    const updated = await prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logoUrl,
        showCompanyLogoOnQuotations: true,
        showCompanyLogoOnOrders: true,
        updatedBy: 'system'
      }
    });
    
    console.log('Company logo updated successfully:', {
      id: updated.id,
      logoUrl: updated.logoUrl,
      showCompanyLogoOnQuotations: updated.showCompanyLogoOnQuotations,
      showCompanyLogoOnOrders: updated.showCompanyLogoOnOrders
    });
    
  } catch (error) {
    console.error('Error updating company logo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompanyLogo();