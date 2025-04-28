// Background script
chrome.runtime.onInstalled.addListener(function() {
  console.log('Linky extension installed');
});

// Initialize storage with empty links array if not already set
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['links', 'sheetId'], function(result) {
    if (!result.links) {
      chrome.storage.local.set({links: []});
    }
  });
});

// Handle requests from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkSheetsConnection") {
    // Check if Google Sheets is connected
    chrome.storage.local.get(['sheetId'], function(result) {
      sendResponse({
        connected: !!result.sheetId,
        sheetId: result.sheetId || null
      });
    });
    return true; // Keep the messaging channel open for async response
  }
});