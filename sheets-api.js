/**
 * Google Sheets API integration for Linky extension
 */

class SheetsAPI {
  constructor() {
    this.sheetId = null;
    this.sheetName = 'Links';
    this.accessToken = null;
    
    // Load saved sheet ID from storage
    chrome.storage.local.get(['sheetId'], (result) => {
      if (result.sheetId) {
        this.sheetId = result.sheetId;
      }
    });
  }

  /**
   * Extracts sheet ID from URL or returns the ID directly
   */
  parseSheetId(input) {
    // Check if input is a full Google Sheets URL
    const urlRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = input.match(urlRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Otherwise assume it's already just the ID
    return input;
  }

  /**
   * Connect to a Google Sheet
   */
  async connect(sheetIdOrUrl) {
    try {
      this.sheetId = this.parseSheetId(sheetIdOrUrl);
      
      // Save sheet ID to storage
      chrome.storage.local.set({ sheetId: this.sheetId });
      
      // Try to authenticate and verify sheet exists
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Failed to obtain authentication token");
      }
      
      const exists = await this.checkSheetExists();
      
      if (!exists) {
        // If sheet doesn't exist, create it
        await this.createSheet();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to connect to sheet:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to Google Sheets'
      };
    }
  }

  /**
   * Disconnect from the current Google Sheet
   */
  disconnect() {
    this.sheetId = null;
    chrome.storage.local.remove(['sheetId']);
    return { success: true };
  }

  /**
   * Get OAuth token for Google Sheets API
   */
  async getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error("Auth error:", chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!token) {
          console.error("No token received");
          reject(new Error("Authentication failed"));
          return;
        }
        
        console.log("Got auth token:", token.substring(0, 5) + "...");
        this.accessToken = token;
        resolve(token);
      });
    });
  }

  /**
   * Check if the sheet exists and is accessible
   */
  async checkSheetExists() {
    try {
      if (!this.accessToken) {
        await this.getAuthToken();
      }
      
      console.log("Checking sheet:", this.sheetId);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}?fields=spreadsheetId`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error("Sheet not accessible", response.status, response.statusText);
        if (response.status === 404) {
          return false;
        }
        throw new Error('Sheet not accessible: ' + response.statusText);
      }

      return true;
    } catch (error) {
      console.error("Error checking sheet:", error);
      if (error.message.includes('Sheet not accessible')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new Links sheet with headers
   */
  async createSheet() {
    try {
      if (!this.accessToken) {
        await this.getAuthToken();
      }
      
      // First, check if a sheet with the name 'Links' already exists
      console.log("Creating sheet in spreadsheet:", this.sheetId);
      const getResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}?fields=sheets.properties`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!getResponse.ok) {
        console.error("Failed to access spreadsheet", getResponse.status, getResponse.statusText);
        throw new Error('Failed to access spreadsheet: ' + getResponse.statusText);
      }

      const data = await getResponse.json();
      let sheetExists = false;
      let sheetId = 0;

      if (data.sheets) {
        for (const sheet of data.sheets) {
          if (sheet.properties && sheet.properties.title === this.sheetName) {
            sheetExists = true;
            sheetId = sheet.properties.sheetId;
            break;
          }
        }
      }

      // If 'Links' sheet doesn't exist, create it
      if (!sheetExists) {
        console.log("Adding new sheet:", this.sheetName);
        const addSheetResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: this.sheetName
                    }
                  }
                }
              ]
            })
          }
        );

        if (!addSheetResponse.ok) {
          console.error("Failed to create sheet", addSheetResponse.status, addSheetResponse.statusText);
          throw new Error('Failed to create Links sheet: ' + addSheetResponse.statusText);
        }
        
        const addSheetData = await addSheetResponse.json();
        console.log("Sheet created:", addSheetData);
      }

      // Add headers to the sheet
      console.log("Adding headers to sheet:", this.sheetName);
      const headerResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.sheetName}!A1:D1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [['Title', 'URL', 'Date', 'Notes']]
          })
        }
      );

      if (!headerResponse.ok) {
        console.error("Failed to add headers", headerResponse.status, headerResponse.statusText);
        throw new Error('Failed to add headers to sheet: ' + headerResponse.statusText);
      }

      console.log("Headers added successfully");
      return true;
    } catch (error) {
      console.error('Error creating sheet:', error);
      throw error;
    }
  }

  /**
   * Add a new link to the connected Google Sheet
   */
  async addLink(link) {
    if (!this.sheetId) {
      console.error("No sheet connected");
      return { success: false, error: 'No sheet connected' };
    }

    try {
      // Make sure we have a fresh token
      await this.getAuthToken();
      
      // Append data to the sheet
      console.log("Adding link to sheet:", link.url);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.sheetName}!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[
              link.title || '',
              link.url,
              link.date,
              ''  // Empty notes column
            ]]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to add link to sheet", response.status, response.statusText, errorText);
        throw new Error('Failed to add link to sheet: ' + response.statusText);
      }

      const data = await response.json();
      console.log("Link added successfully:", data);
      return { success: true };
    } catch (error) {
      console.error('Error adding link to sheet:', error);
      return { 
        success: false,
        error: error.message || 'Failed to add link to Google Sheet'
      };
    }
  }

  /**
   * Check if a sheet is currently connected
   */
  isConnected() {
    return !!this.sheetId;
  }

  /**
   * Get the current sheet ID
   */
  getSheetId() {
    return this.sheetId;
  }
}

// Create global instance
window.sheetsApi = new SheetsAPI();