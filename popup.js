document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  const savedLinksDiv = document.getElementById('savedLinks');
  const settingsButton = document.getElementById('settingsButton');
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const backButton = document.getElementById('backButton');
  const manageLinksDiv = document.getElementById('manageLinks');
  const deleteSelectedButton = document.getElementById('deleteSelected');
  const downloadCSVButton = document.getElementById('downloadCSV');
  
  // Google Sheets elements
  const sheetIdInput = document.getElementById('sheetId');
  const connectSheetButton = document.getElementById('connectSheet');
  const disconnectSheetButton = document.getElementById('disconnectSheet');
  const sheetStatusEl = document.getElementById('sheetStatus');
  
  // Your specific Google Sheet URL
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1uFtOywf3Ppxc-4etFZrhcudXMm3BTvuAq8bfy2_ATfY/edit?usp=sharing';
  
  // Define all functions first
  
  // Function to show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    // Clear status after 3 seconds
    setTimeout(function() {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
  
  // Function to display all saved links
  function displaySavedLinks() {
    chrome.storage.local.get(['links'], function(result) {
      const links = result.links || [];
      savedLinksDiv.innerHTML = '';
      
      if (links.length === 0) {
        savedLinksDiv.textContent = 'No links saved yet.';
        return;
      }
      
      // Display each link without delete button
      links.forEach(function(link, index) {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'saved-link';
        
        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.textContent = link.title || link.url;
        linkElement.target = '_blank';
        
        linkContainer.appendChild(linkElement);
        
        // Add date info
        const dateInfo = document.createElement('div');
        dateInfo.textContent = `Saved on: ${link.date}`;
        dateInfo.style.fontSize = '10px';
        dateInfo.style.color = '#666';
        linkContainer.appendChild(dateInfo);
        
        savedLinksDiv.appendChild(linkContainer);
      });
    });
  }
  
  // Function to display links in settings/manage mode
  function displayManageLinks() {
    chrome.storage.local.get(['links'], function(result) {
      const links = result.links || [];
      manageLinksDiv.innerHTML = '';
      
      if (links.length === 0) {
        manageLinksDiv.textContent = 'No links saved yet.';
        return;
      }
      
      // Display each link with a checkbox
      links.forEach(function(link, index) {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'link-checkbox';
        checkbox.value = index;
        
        const linkText = document.createTextNode(link.title || link.url);
        
        linkContainer.appendChild(checkbox);
        linkContainer.appendChild(linkText);
        
        manageLinksDiv.appendChild(linkContainer);
      });
    });
  }
  
  // Function to check Google Sheets connection status
  function checkSheetConnection() {
    // Check if we have a saved sheet ID
    chrome.storage.local.get(['sheetId'], function(result) {
      if (result.sheetId) {
        sheetIdInput.value = result.sheetId;
        sheetStatusEl.textContent = 'Connected to Google Sheet';
        sheetStatusEl.className = 'sheet-status connected';
        disconnectSheetButton.disabled = false;
      } else {
        sheetStatusEl.textContent = 'Not connected to any spreadsheet';
        sheetStatusEl.className = 'sheet-status not-connected';
        disconnectSheetButton.disabled = true;
        
        // Auto-fill the sheet URL
        sheetIdInput.value = SHEET_URL;
      }
    });
  }

  // Only call functions AFTER they have been defined
  // Display previously saved links
  displaySavedLinks();
  
  // Check if sheet is connected
  checkSheetConnection();
  
  // Add event listener to the save button
  saveButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = currentTab.url;
      const title = currentTab.title;
      
      // Save to Chrome storage
      chrome.storage.local.get(['links'], function(result) {
        const links = result.links || [];
        
        // Check if link already exists
        if (links.some(link => link.url === url)) {
          showStatus('Link already saved!', 'error');
          return;
        }
        
        // Create new link object
        const newLink = {
          url: url,
          title: title,
          date: new Date().toLocaleString()
        };
        
        // Add to links array
        links.push(newLink);
        
        // Save updated links back to storage
        chrome.storage.local.set({links: links}, function() {
          showStatus('Link saved successfully!', 'success');
          displaySavedLinks();
          
          // If Google Sheet is connected, add to sheet as well
          if (window.sheetsApi && window.sheetsApi.isConnected()) {
            window.sheetsApi.addLink(newLink)
              .then(response => {
                if (!response.success) {
                  console.error('Failed to add link to sheet:', response.error);
                  showStatus('Failed to add to Google Sheet', 'error');
                } else {
                  console.log('Link added to Google Sheet');
                }
              })
              .catch(err => {
                console.error('Error adding to sheet:', err);
                showStatus('Error adding to Google Sheet', 'error');
              });
          }
        });
      });
    });
  });
  
  // Settings button toggle
  settingsButton.addEventListener('click', function() {
    mainView.classList.remove('active');
    settingsView.classList.add('active');
    displayManageLinks();
  });
  
  // Back button
  backButton.addEventListener('click', function() {
    settingsView.classList.remove('active');
    mainView.classList.add('active');
    displaySavedLinks();
  });
  
  // Google Sheets connect button
  connectSheetButton.addEventListener('click', async function() {
    const sheetIdOrUrl = sheetIdInput.value.trim();
    
    if (!sheetIdOrUrl) {
      showStatus('Please enter a Google Sheet ID or URL', 'error');
      return;
    }
    
    sheetStatusEl.textContent = 'Connecting...';
    connectSheetButton.disabled = true;
    
    try {
      const result = await window.sheetsApi.connect(sheetIdOrUrl);
      
      if (result.success) {
        sheetStatusEl.textContent = 'Connected to Google Sheet';
        sheetStatusEl.className = 'sheet-status connected';
        disconnectSheetButton.disabled = false;
        showStatus('Connected to Google Sheet', 'success');
      } else {
        sheetStatusEl.textContent = 'Connection failed: ' + result.error;
        sheetStatusEl.className = 'sheet-status not-connected';
        showStatus('Failed to connect to Google Sheet', 'error');
      }
    } catch (error) {
      console.error('Error connecting to sheet:', error);
      sheetStatusEl.textContent = 'Connection failed: ' + error.message;
      sheetStatusEl.className = 'sheet-status not-connected';
      showStatus('Failed to connect to Google Sheet', 'error');
    }
    
    connectSheetButton.disabled = false;
  });
  
  // Google Sheets disconnect button
  disconnectSheetButton.addEventListener('click', function() {
    window.sheetsApi.disconnect();
    sheetStatusEl.textContent = 'Not connected to any spreadsheet';
    sheetStatusEl.className = 'sheet-status not-connected';
    disconnectSheetButton.disabled = true;
    sheetIdInput.value = SHEET_URL; // Reset to the default sheet URL
    showStatus('Disconnected from Google Sheet', 'success');
  });
  
  // Delete selected links
  deleteSelectedButton.addEventListener('click', function() {
    const selectedCheckboxes = document.querySelectorAll('input[name="link-checkbox"]:checked');
    const selectedIndices = Array.from(selectedCheckboxes).map(checkbox => parseInt(checkbox.value));
    
    if (selectedIndices.length === 0) {
      showStatus('No links selected!', 'error');
      return;
    }
    
    chrome.storage.local.get(['links'], function(result) {
      let links = result.links || [];
      
      // Sort indices in descending order to avoid index shifting when removing items
      selectedIndices.sort((a, b) => b - a);
      
      // Remove selected links
      selectedIndices.forEach(index => {
        if (index >= 0 && index < links.length) {
          links.splice(index, 1);
        }
      });
      
      chrome.storage.local.set({links: links}, function() {
        displayManageLinks();
        showStatus('Selected links deleted!', 'success');
      });
    });
  });
  
  // Download CSV
  downloadCSVButton.addEventListener('click', function() {
    chrome.storage.local.get(['links'], function(result) {
      const links = result.links || [];
      
      if (links.length === 0) {
        showStatus('No links to download!', 'error');
        return;
      }
      
      // Create CSV content
      let csvContent = 'Title,URL,Date\n';
      links.forEach(link => {
        const title = link.title ? `"${link.title.replace(/"/g, '""')}"` : '';
        const url = `"${link.url.replace(/"/g, '""')}"`;
        const date = `"${link.date.replace(/"/g, '""')}"`;
        csvContent += `${title},${url},${date}\n`;
      });
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      
      // Set link attributes
      downloadLink.href = url;
      downloadLink.download = `linky_saved_links_${new Date().toISOString().slice(0, 10)}.csv`;
      
      // Append to body, click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      showStatus('CSV file downloaded!', 'success');
    });
  });
});