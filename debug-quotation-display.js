// Add this script to the browser console to debug the quotation display
// Run this on the quotation page: http://localhost:3000/quotations/cmcjmlggo0009v23gwer2a1g1

console.log('=== Debugging Quotation Display ===');

// Check if React DevTools is available
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('React DevTools detected');
}

// Look for quotation data in the page
const checkQuotationData = () => {
  // Check all elements with data attributes
  const elementsWithData = document.querySelectorAll('[data-quotation-id], [data-items-count]');
  console.log('Elements with data attributes:', elementsWithData.length);
  
  // Check for item rows in tables
  const itemRows = document.querySelectorAll('tr[data-item-id], .quotation-item, .item-row');
  console.log('Item rows found:', itemRows.length);
  
  // Check for line groups
  const lineGroups = document.querySelectorAll('[data-line-number], .line-group');
  console.log('Line groups found:', lineGroups.length);
  
  // Check for any visible item codes
  const itemCodes = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.includes('CATERPILLAR-ELEC-0017')
  );
  console.log('Elements containing item code:', itemCodes.length);
  if (itemCodes.length > 0) {
    console.log('Item code found in:', itemCodes[0].tagName, itemCodes[0].className);
  }
  
  // Check for "No items" or empty state messages
  const emptyStates = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.toLowerCase().includes('no items') || 
    el.textContent?.toLowerCase().includes('add item') ||
    el.textContent?.toLowerCase().includes('empty')
  );
  console.log('Empty state messages found:', emptyStates.length);
  emptyStates.forEach(el => {
    console.log('Empty state:', el.textContent?.trim());
  });
  
  // Check for loading states
  const loadingElements = document.querySelectorAll('.animate-pulse, .loading, [data-loading="true"]');
  console.log('Loading elements:', loadingElements.length);
  
  // Check console for any errors
  console.log('\nTo see React component props, install React Developer Tools extension');
};

checkQuotationData();

// Instructions for manual debugging
console.log('\n=== Manual Debug Steps ===');
console.log('1. Open React DevTools (if installed)');
console.log('2. Search for QuotationForm component');
console.log('3. Check the props.quotation.items array');
console.log('4. Check if CleanLineEditor is receiving items');
console.log('\nOr run: document.querySelector(".quotation-items")?.innerHTML');