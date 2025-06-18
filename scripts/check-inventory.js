const fetch = require('node-fetch');

async function checkInventory() {
  console.log('Checking inventory items...\n');
  
  try {
    // Check all items
    const allResponse = await fetch('http://localhost:3000/api/inventory/items');
    const allData = await allResponse.json();
    console.log('All items response:', JSON.stringify(allData, null, 2).substring(0, 500));
    
    // Check saleable items
    const saleableResponse = await fetch('http://localhost:3000/api/inventory/items?isSaleable=true&isActive=true');
    const saleableData = await saleableResponse.json();
    console.log('\nSaleable items response:', JSON.stringify(saleableData, null, 2).substring(0, 500));
    
    // Search for "Lap"
    const searchResponse = await fetch('http://localhost:3000/api/inventory/items?search=Lap&isSaleable=true&isActive=true');
    const searchData = await searchResponse.json();
    console.log('\nSearch "Lap" response:', JSON.stringify(searchData, null, 2));
    
    // Summary
    const allCount = allData.data ? (allData.data.data ? allData.data.data.length : allData.data.length) : 0;
    const saleableCount = saleableData.data ? (saleableData.data.data ? saleableData.data.data.length : saleableData.data.length) : 0;
    const searchCount = searchData.data ? (searchData.data.data ? searchData.data.data.length : searchData.data.length) : 0;
    
    console.log('\n--- Summary ---');
    console.log(`Total items: ${allCount}`);
    console.log(`Saleable items: ${saleableCount}`);
    console.log(`Items matching "Lap": ${searchCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkInventory();