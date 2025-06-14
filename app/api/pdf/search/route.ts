import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const url = formData.get('url') as string;
    const searchTerm = formData.get('searchTerm') as string;
    const optionsStr = formData.get('options') as string;

    if (!file && !url) {
      return NextResponse.json(
        { success: false, error: 'No file or URL provided' },
        { status: 400 }
      );
    }

    if (!searchTerm) {
      return NextResponse.json(
        { success: false, error: 'No search term provided' },
        { status: 400 }
      );
    }

    const options = optionsStr ? JSON.parse(optionsStr) : {};
    const { caseSensitive = false, wholeWords = false, regex = false } = options;

    // This is a mock implementation
    // In a real application, you would:
    // 1. Extract text from PDF using a library like PDF2JSON
    // 2. Perform actual text search with the given options
    // 3. Return actual positions and context

    // Mock search results
    const mockResults = [
      {
        page: 1,
        text: searchTerm,
        context: `This is some context around the search term "${searchTerm}" found on page 1.`,
        position: { x: 100, y: 200 },
        lineNumber: 5,
        characterIndex: 150,
      },
      {
        page: 2,
        text: searchTerm,
        context: `Another occurrence of "${searchTerm}" appears on page 2 with different context.`,
        position: { x: 200, y: 300 },
        lineNumber: 12,
        characterIndex: 890,
      },
      {
        page: 3,
        text: searchTerm,
        context: `Final match for "${searchTerm}" is located on page 3 near the bottom.`,
        position: { x: 150, y: 450 },
        lineNumber: 25,
        characterIndex: 1456,
      },
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Filter results based on search options
    let filteredResults = mockResults;
    
    if (!caseSensitive) {
      filteredResults = filteredResults.filter(result => 
        result.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      filteredResults = filteredResults.filter(result => 
        result.text.includes(searchTerm)
      );
    }

    return NextResponse.json({
      success: true,
      results: filteredResults,
      metadata: {
        totalMatches: filteredResults.length,
        searchTerm: searchTerm,
        options: options,
        searchTime: '0.8s',
      },
    });

  } catch (error) {
    console.error('PDF search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF search failed' 
      },
      { status: 500 }
    );
  }
}