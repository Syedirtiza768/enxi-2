async function testApiEndpoint() {
  const quotationId = 'cmcd8ugzr0169v2dpq2eipa1v'
  const baseUrl = 'http://localhost:3002'
  
  try {
    console.log('Testing internal view API endpoint...')
    const response = await fetch(`${baseUrl}/api/quotations/${quotationId}?view=internal`)
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    
    console.log('\n=== API RESPONSE STRUCTURE ===')
    console.log('Success:', data.success)
    console.log('View:', data.view)
    console.log('Has data.data:', !!data.data)
    console.log('Has data.data.items:', !!data.data?.items)
    console.log('Has data.data.lines:', !!data.data?.lines)
    
    if (data.data?.lines) {
      console.log('\n=== LINES IN API RESPONSE ===')
      data.data.lines.forEach((line: any) => {
        console.log(`Line ${line.lineNumber}: ${line.items?.length || 0} items`)
      })
    }
    
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

testApiEndpoint()