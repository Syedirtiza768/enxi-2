import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { cwd } from 'process';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use cwd() for better compatibility
    const baseDir = cwd();
    const uploadDir = join(baseDir, 'public', 'uploads', 'logos');
    
    console.log('Upload paths:', {
      baseDir,
      uploadDir
    });
    
    try {
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    } catch (mkdirError) {
      console.error('Failed to create upload directory:', mkdirError);
      throw new Error('Failed to create upload directory');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = file.name.split('.').pop();
    const filename = `company-logo-${uniqueSuffix}.${fileExt}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/logos/${filename}`;

    return NextResponse.json({
      url: fileUrl,
      filename: filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload logo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}