document.addEventListener('DOMContentLoaded', function() {
  // Existing element references
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
  
  // Firebase configuration elements
  const firebaseNotConfiguredWarning = document.getElementById('firebaseNotConfigured');
  const firebaseNotConfiguredCollab = document.getElementById('firebaseNotConfiguredCollab');
  const firebaseStatusEl = document.getElementById('firebaseStatus');
  const saveFirebaseConfigBtn = document.getElementById('saveFirebaseConfig');
  const fbApiKeyInput = document.getElementById('fbApiKey');
  const fbAuthDomainInput = document.getElementById('fbAuthDomain');
  const fbProjectIdInput = document.getElementById('fbProjectId');
  const fbStorageBucketInput = document.getElementById('fbStorageBucket');
  const fbMessagingSenderIdInput = document.getElementById('fbMessagingSenderId');
  const fbAppIdInput = document.getElementById('fbAppId');
  const fbDatabaseURLInput = document.getElementById('fbDatabaseURL');
  
  // Your specific Google Sheet URL
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1uFtOywf3Ppxc-4etFZrhcudXMm3BTvuAq8bfy2_ATfY/edit?usp=sharing';
  
  // Define all functions first
  
  // Make the showStatus function available globally for other components
  window.showStatus = function(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    // Clear status after 3 seconds
    setTimeout(function() {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
  
  // Function to show status message
  function showStatus(message, type) {
    window.showStatus(message, type);
  }
  
  // Function to display all saved links
  function displaySavedLinks() {
    // Check which mode we're in
    const isCollaborative = window.collaborativeMode && 
                           window.collaborativeMode.currentMode === 'collaborative';
    
    if (isCollaborative) {
      displayCollaborativeLinks();
    } else {
      displayPersonalLinks();
    }
  }
  
  // Make displaySavedLinks globally available
  window.displaySavedLinks = displaySavedLinks;
  
  // Function to display personal links from Chrome storage
  function displayPersonalLinks() {
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
  
  // Function to display collaborative links from Firebase
  async function displayCollaborativeLinks() {
    try {
      if (!window.collaborativeMode) {
        throw new Error("Collaborative mode not initialized");
      }
      
      savedLinksDiv.innerHTML = '<div style="text-align:center;">Loading team links...</div>';
      
      const links = await window.collaborativeMode.getTeamLinks();
      
      savedLinksDiv.innerHTML = '';
      
      if (links.length === 0) {
        savedLinksDiv.textContent = 'No team links saved yet.';
        return;
      }
      
      // Display each link
      links.forEach(function(link) {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'saved-link';
        
        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.textContent = link.title || link.url;
        linkElement.target = '_blank';
        
        linkContainer.appendChild(linkElement);
        
        // Add date and who added it
        const metaInfo = document.createElement('div');
        metaInfo.textContent = `Saved ${link.date ? 'on ' + link.date : ''} by ${link.addedBy || 'Unknown'}`;
        metaInfo.style.fontSize = '10px';
        metaInfo.style.color = '#666';
        linkContainer.appendChild(metaInfo);
        
        savedLinksDiv.appendChild(linkContainer);
      });
    } catch (error) {
      console.error('Error displaying collaborative links:', error);
      savedLinksDiv.innerHTML = `<div style="color:red;">Error loading team links: ${error.message}</div>`;
    }
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
  
  // Function to check Firebase configuration status
  function checkFirebaseStatus() {
    try {
      const config = window.firebaseApi.getDisplayConfig();
      
      if (config && config.configured) {
        // Firebase is configured, update UI
        firebaseNotConfiguredWarning.style.display = 'none';
        firebaseNotConfiguredCollab.style.display = 'none';
        firebaseStatusEl.textContent = `Configured (Project: ${config.projectId})`;
        firebaseStatusEl.className = 'sheet-status connected';
        
        // Fill the form with existing config (but mask sensitive data)
        fbApiKeyInput.value = '••••••••••••••••••••••'; // Masked for security
        fbAuthDomainInput.value = config.authDomain || '';
        fbProjectIdInput.value = config.projectId || '';
        
        // If Firebase is initialized, enable collaboration features
        if (window.firebaseApi.isInitialized) {
          enableCollaborationFeatures();
        }
      } else {
        // Not configured, show warnings
        firebaseNotConfiguredWarning.style.display = 'block';
        firebaseNotConfiguredCollab.style.display = 'block';
        firebaseStatusEl.textContent = 'Not configured';
        firebaseStatusEl.className = 'sheet-status not-connected';
        disableCollaborationFeatures();
      }
    } catch (error) {
      console.error('Error checking Firebase status:', error);
      firebaseStatusEl.textContent = 'Error checking status';
      firebaseStatusEl.className = 'sheet-status not-connected';
    }
  }
  
  // Function to enable collaboration features
  function enableCollaborationFeatures() {
    document.getElementById('collaborativeModeBtn').disabled = false;
  }
  
  // Function to disable collaboration features
  function disableCollaborationFeatures() {
    document.getElementById('collaborativeModeBtn').disabled = true;
    if (window.collaborativeMode && window.collaborativeMode.currentMode === 'collaborative') {
      window.collaborativeMode.setMode('personal');
    }
  }
  
  // Function to save Firebase configuration
  async function saveFirebaseConfig() {
    const config = {
      apiKey: fbApiKeyInput.value.trim(),
      authDomain: fbAuthDomainInput.value.trim(),
      projectId: fbProjectIdInput.value.trim(),
      storageBucket: fbStorageBucketInput.value.trim() || null,
      messagingSenderId: fbMessagingSenderIdInput.value.trim() || null,
      appId: fbAppIdInput.value.trim(),
      databaseURL: fbDatabaseURLInput.value.trim()
    };
    
    try {
      // Validate the required fields
      if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId || !config.databaseURL) {
        showStatus('Please fill all required Firebase fields', 'error');
        return;
      }
      
      showStatus('Saving Firebase configuration...', 'info');
      const result = await window.firebaseApi.updateConfig(config);
      
      if (result.success) {
        showStatus('Firebase configuration saved successfully', 'success');
        
        if (result.message) {
          // If we need to reload
          setTimeout(() => {
            chrome.runtime.reload();
          }, 1500);
        } else {
          // If Firebase initialized without requiring reload
          checkFirebaseStatus();
        }
      } else {
        showStatus(`Failed to save Firebase configuration: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error saving Firebase configuration:', error);
      showStatus('Error saving Firebase configuration', 'error');
    }
  }
  
  // Function to handle Firebase-related events
  function setupFirebaseEventListeners() {
    // Listen for Firebase initialization success
    document.addEventListener('firebase-ready', function(event) {
      checkFirebaseStatus();
    });
    
    // Listen for Firebase initialization failure
    document.addEventListener('firebase-error', function(event) {
      console.error('Firebase initialization error:', event.detail.error);
      firebaseStatusEl.textContent = `Error: ${event.detail.error}`;
      firebaseStatusEl.className = 'sheet-status not-connected';
    });
  }
  
  // Function to save a link
  async function saveLink(url, title) {
    // Create new link object
    const newLink = {
      url: url,
      title: title,
      date: new Date().toLocaleString()
    };
    
    // Check which mode we're in
    const isCollaborative = window.collaborativeMode && 
                           window.collaborativeMode.currentMode === 'collaborative';
    
    // Always save to local storage
    chrome.storage.local.get(['links'], async function(result) {
      const links = result.links || [];
      
      // Check if link already exists
      if (links.some(link => link.url === url)) {
        showStatus('Link already saved!', 'error');
        return;
      }
      
      // Add to links array
      links.push(newLink);
      
      // Save updated links back to storage
      chrome.storage.local.set({links: links}, function() {
        showStatus('Link saved successfully!', 'success');
        displaySavedLinks();
      });
    });
    
    // If in collaborative mode, also save to team
    if (isCollaborative) {
      try {
        const result = await window.collaborativeMode.saveLinkCollaborative(newLink);
        
        if (!result.success) {
          console.error('Failed to save to team:', result.error);
          showStatus('Saved locally, but failed to share with team', 'error');
        } else {
          showStatus('Saved and shared with team!', 'success');
        }
      } catch (error) {
        console.error('Error saving link to team:', error);
        showStatus('Saved locally, but failed to share with team', 'error');
      }
    }
    
    // If Google Sheet is connected, add to sheet as well
    if (window.sheetsApi && window.sheetsApi.isConnected()) {
      try {
        const response = await window.sheetsApi.addLink(newLink);
        
        if (!response.success) {
          console.error('Failed to add link to sheet:', response.error);
          showStatus('Saved locally, but failed to add to Google Sheet', 'error');
        }
      } catch (err) {
        console.error('Error adding to sheet:', err);
        showStatus('Saved locally, but failed to add to Google Sheet', 'error');
      }
    }
  }

  // Function to initialize Firebase configuration fields
  function initFirebaseConfigForm() {
    // Load Firebase config from storage if available
    chrome.storage.local.get(['firebaseConfig'], function(result) {
      if (result.firebaseConfig) {
        const config = result.firebaseConfig;
        fbAuthDomainInput.value = config.authDomain || '';
        fbProjectIdInput.value = config.projectId || '';
        fbStorageBucketInput.value = config.storageBucket || '';
        fbMessagingSenderIdInput.value = config.messagingSenderId || '';
        fbDatabaseURLInput.value = config.databaseURL || '';
        
        // Don't show the API key for security, just a placeholder if it exists
        if (config.apiKey) {
          fbApiKeyInput.value = '••••••••••••••••••••••';
          fbApiKeyInput.setAttribute('data-has-value', 'true');
        }
        
        // Don't show the app ID for security, just a placeholder if it exists
        if (config.appId) {
          fbAppIdInput.value = '••••••••••••••••••••••';
          fbAppIdInput.setAttribute('data-has-value', 'true');
        }
      }
    });
    
    // Set up special handling for masked fields
    fbApiKeyInput.addEventListener('focus', function() {
      if (this.getAttribute('data-has-value') === 'true') {
        this.value = '';
      }
    });
    
    fbAppIdInput.addEventListener('focus', function() {
      if (this.getAttribute('data-has-value') === 'true') {
        this.value = '';
      }
    });
  }

  // Only call functions AFTER they have been defined
  // Display previously saved links
  displaySavedLinks();
  
  // Check if sheet is connected
  checkSheetConnection();
  
  // Check Firebase status
  checkFirebaseStatus();
  
  // Initialize Firebase configuration form
  initFirebaseConfigForm();
  
  // Setup Firebase event listeners
  setupFirebaseEventListeners();
  
  // Add event listener to the save button
  saveButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = currentTab.url;
      const title = currentTab.title;
      
      saveLink(url, title);
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
  
  // Firebase save configuration button
  saveFirebaseConfigBtn.addEventListener('click', saveFirebaseConfig);
  
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