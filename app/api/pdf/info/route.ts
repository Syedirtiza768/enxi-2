import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const url = formData.get('url') as string;

    if (!file && !url) {
      return NextResponse.json(
        { success: false, error: 'No file or URL provided' },
        { status: 400 }
      );
    }

    // This is a mock implementation
    // In a real application, you would use a PDF parsing library
    // to extract actual metadata from the PDF file

    let pdfInfo;

    if (file) {
      // Mock PDF info extraction from file
      pdfInfo = {
        pages: Math.floor(Math.random() * 50) + 1, // Random page count
        title: file.name.replace('.pdf', ''),
        author: 'Enxi ERP System',
        subject: 'Business Document',
        creator: 'Enxi PDF Generator',
        producer: 'React-PDF',
        creationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        modificationDate: new Date(),
        encrypted: false,
        version: '1.4',
        fileSize: file.size,
        keywords: ['business', 'document', 'pdf'],
      };
    } else if (url) {
      // Mock PDF info extraction from URL
      pdfInfo = {
        pages: Math.floor(Math.random() * 30) + 1,
        title: 'Remote PDF Document',
        author: 'External Source',
        subject: 'External Document',
        creator: 'Unknown',
        producer: 'Unknown',
        creationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        modificationDate: new Date(),
        encrypted: false,
        version: '1.4',
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // Random size
        keywords: ['external', 'pdf'],
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      info: pdfInfo,
    });

  } catch (error) {
    console.error('PDF info extraction error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF info extraction failed' 
      },
      { status: 500 }
    );
  }
}