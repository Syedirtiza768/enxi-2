import { readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db/prisma';

async function embedLogoAsBase64() {
  try {
    console.log('Converting logo to base64...');
    
    // Read the logo file
    const logoPath = join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = await readFile(logoPath);
    
    // Convert to base64
    const base64Logo = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    
    console.log('Logo converted to base64, length:', base64Logo.length);
    
    // Update company settings with base64 logo
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
        logoUrl: base64Logo,
        updatedBy: 'system'
      }
    });
    
    console.log('Company logo updated with base64 data successfully');
    console.log('First 100 chars of base64:', base64Logo.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('Error converting logo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

embedLogoAsBase64();