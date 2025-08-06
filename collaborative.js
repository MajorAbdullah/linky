/**
 * Collaborative mode functionality for Linky extension
 * Allows users to share links with team members
 */

class CollaborativeMode {
  constructor() {
    this.currentMode = 'personal'; // 'personal' or 'collaborative'
    this.teamId = null;
    this.teamName = null;
    this.userEmail = null;
    this.userId = null;
    
    // Load saved mode and team info
    chrome.storage.local.get(['currentMode', 'teamId', 'teamName', 'userEmail', 'userId'], result => {
      this.currentMode = result.currentMode || 'personal';
      this.teamId = result.teamId || null;
      this.teamName = result.teamName || null;
      this.userEmail = result.userEmail || null;
      this.userId = result.userId || null;
      
      // Initialize UI based on loaded data
      this.updateModeUI();
      this.updateTeamUI();
    });
  }
  
  /**
   * Initialize collaborative mode UI and event listeners
   */
  initialize() {
    // Mode toggle buttons
    document.getElementById('personalModeBtn').addEventListener('click', () => this.setMode('personal'));
    document.getElementById('collaborativeModeBtn').addEventListener('click', () => this.setMode('collaborative'));
    
    // Team management buttons
    document.getElementById('createTeamBtn').addEventListener('click', () => this.createTeam());
    document.getElementById('joinTeamBtn').addEventListener('click', () => this.joinTeam());
    document.getElementById('leaveTeamBtn').addEventListener('click', () => this.leaveTeam());
    document.getElementById('copyTeamCode').addEventListener('click', () => this.copyTeamCode());
    document.getElementById('loginForCollab').addEventListener('click', () => this.loginForCollaboration());
    
    // Check if user is logged in
    this.checkLoginStatus();
  }
  
  /**
   * Set the current mode (personal or collaborative)
   */
  setMode(mode) {
    if (mode === 'collaborative' && !this.isLoggedIn()) {
      this.showStatus('You need to log in to use collaborative mode', 'error');
      return;
    }
    
    this.currentMode = mode;
    chrome.storage.local.set({ currentMode: mode });
    
    this.updateModeUI();
    
    // Refresh links display based on selected mode
    if (window.displaySavedLinks) {
      window.displaySavedLinks();
    }
    
    if (mode === 'collaborative' && !this.teamId) {
      document.getElementById('settingsButton').click(); // Open settings to prompt team setup
    }
  }
  
  /**
   * Update UI based on current mode
   */
  updateModeUI() {
    const personalBtn = document.getElementById('personalModeBtn');
    const collabBtn = document.getElementById('collaborativeModeBtn');
    const teamInfoArea = document.getElementById('teamInfoArea');
    
    if (this.currentMode === 'personal') {
      personalBtn.classList.add('active');
      collabBtn.classList.remove('active');
      teamInfoArea.style.display = 'none';
    } else {
      personalBtn.classList.remove('active');
      collabBtn.classList.add('active');
      teamInfoArea.style.display = 'block';
    }
  }
  
  /**
   * Update team-related UI elements
   */
  updateTeamUI() {
    const teamInfo = document.getElementById('teamInfo');
    const notLoggedInCollab = document.getElementById('notLoggedInCollab');
    const loggedInCollab = document.getElementById('loggedInCollab');
    const noTeam = document.getElementById('noTeam');
    const hasTeam = document.getElementById('hasTeam');
    
    // Update team info display in main view
    if (this.teamId && this.teamName) {
      teamInfo.textContent = `Team: ${this.teamName}`;
    } else {
      teamInfo.textContent = 'Not connected to any team';
    }
    
    // Update settings view based on login/team status
    if (this.isLoggedIn()) {
      notLoggedInCollab.style.display = 'none';
      loggedInCollab.style.display = 'block';
      
      if (this.teamId) {
        noTeam.style.display = 'none';
        hasTeam.style.display = 'block';
        
        document.getElementById('teamName').textContent = this.teamName || 'Unknown Team';
        document.getElementById('currentTeamCode').value = this.teamId;
      } else {
        noTeam.style.display = 'block';
        hasTeam.style.display = 'none';
      }
    } else {
      notLoggedInCollab.style.display = 'block';
      loggedInCollab.style.display = 'none';
    }
  }
  
  /**
   * Check if user is logged in to Google
   */
  isLoggedIn() {
    return !!this.userEmail;
  }
  
  /**
   * Check login status with Google
   */
  async checkLoginStatus() {
    try {
      // Try to get user info if we have a token
      if (window.sheetsApi && window.sheetsApi.accessToken) {
        await this.getUserInfo();
      } else {
        // No token yet, will update when sheets-api connects
        this.updateTeamUI();
      }
    } catch (error) {
      console.error('Failed to check login status:', error);
      this.updateTeamUI();
    }
  }
  
  /**
   * Get user info from Google
   */
  async getUserInfo() {
    try {
      if (!window.sheetsApi || !window.sheetsApi.accessToken) {
        throw new Error('Not authenticated with Google');
      }
      
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${window.sheetsApi.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const data = await response.json();
      this.userEmail = data.email;
      this.userId = data.id;
      
      // Save user info
      chrome.storage.local.set({ 
        userEmail: this.userEmail,
        userId: this.userId
      });
      
      // If we already have team info, try to verify it
      if (this.teamId) {
        await this.verifyTeamMembership();
      }
      
      this.updateTeamUI();
    } catch (error) {
      console.error('Error getting user info:', error);
      this.userEmail = null;
      this.userId = null;
      chrome.storage.local.remove(['userEmail', 'userId']);
      this.updateTeamUI();
    }
  }
  
  /**
   * Trigger Google login for collaboration
   */
  async loginForCollaboration() {
    try {
      // Use the existing sheets API for authentication
      if (!window.sheetsApi) {
        this.showStatus('Sheets API not initialized', 'error');
        return;
      }
      
      await window.sheetsApi.getAuthToken();
      await this.getUserInfo();
      this.updateTeamUI();
      this.showStatus('Successfully logged in', 'success');
    } catch (error) {
      console.error('Login failed:', error);
      this.showStatus('Login failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Create a new team
   */
  async createTeam() {
    try {
      if (!this.isLoggedIn()) {
        this.showStatus('You need to log in first', 'error');
        return;
      }
      
      // Generate a new team ID
      const teamId = this.generateTeamId();
      const teamName = 'Team ' + teamId.substring(0, 6);
      
      // Create a new sheet for the team if we have a spreadsheet
      if (window.sheetsApi && window.sheetsApi.sheetId) {
        await this.createTeamSheet(teamId, teamName);
      } else {
        this.showStatus('You need to connect a Google Sheet first', 'error');
        return;
      }
      
      this.teamId = teamId;
      this.teamName = teamName;
      
      // Save team info
      chrome.storage.local.set({
        teamId: this.teamId,
        teamName: this.teamName
      });
      
      this.updateTeamUI();
      this.showStatus('Team created successfully', 'success');
      
      // Switch to collaborative mode
      this.setMode('collaborative');
    } catch (error) {
      console.error('Failed to create team:', error);
      this.showStatus('Failed to create team: ' + error.message, 'error');
    }
  }
  
  /**
   * Create a new sheet for the team
   */
  async createTeamSheet(teamId, teamName) {
    if (!window.sheetsApi || !window.sheetsApi.sheetId) {
      throw new Error('No Google Sheet connected');
    }
    
    // Create team info in the Teams sheet
    await this.ensureTeamsSheet();
    
    // Add the team to the Teams sheet
    await this.addTeamToTeamsSheet(teamId, teamName);
    
    // Create a sheet for the team
    await this.ensureTeamSheet(teamId);
    
    // Add current user as a member
    await this.addUserToTeam(teamId, this.userEmail, this.userId);
  }
  
  /**
   * Ensure the Teams sheet exists
   */
  async ensureTeamsSheet() {
    try {
      const sheetName = 'Teams';
      const teamsSheet = await this.findOrCreateSheet(sheetName);
      
      // Add headers if new sheet
      if (teamsSheet.isNew) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A1:C1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['TeamID', 'TeamName', 'CreatedAt']]
            })
          }
        );
      }
    } catch (error) {
      console.error('Error ensuring Teams sheet:', error);
      throw new Error('Failed to create Teams sheet');
    }
  }
  
  /**
   * Ensure the Members sheet exists
   */
  async ensureMembersSheet() {
    try {
      const sheetName = 'Members';
      const membersSheet = await this.findOrCreateSheet(sheetName);
      
      // Add headers if new sheet
      if (membersSheet.isNew) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A1:D1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['TeamID', 'UserEmail', 'UserID', 'JoinedAt']]
            })
          }
        );
      }
    } catch (error) {
      console.error('Error ensuring Members sheet:', error);
      throw new Error('Failed to create Members sheet');
    }
  }
  
  /**
   * Add a team to the Teams sheet
   */
  async addTeamToTeamsSheet(teamId, teamName) {
    try {
      const sheetName = 'Teams';
      const now = new Date().toISOString();
      
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A:C:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[teamId, teamName, now]]
          })
        }
      );
    } catch (error) {
      console.error('Error adding team to Teams sheet:', error);
      throw new Error('Failed to register team');
    }
  }
  
  /**
   * Add a user to the Members sheet
   */
  async addUserToTeam(teamId, userEmail, userId) {
    try {
      await this.ensureMembersSheet();
      
      const sheetName = 'Members';
      const now = new Date().toISOString();
      
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[teamId, userEmail, userId, now]]
          })
        }
      );
    } catch (error) {
      console.error('Error adding user to team:', error);
      throw new Error('Failed to add user to team');
    }
  }
  
  /**
   * Ensure a team sheet exists
   */
  async ensureTeamSheet(teamId) {
    try {
      const sheetName = `Team_${teamId}`;
      const teamSheet = await this.findOrCreateSheet(sheetName);
      
      // Add headers if new sheet
      if (teamSheet.isNew) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A1:E1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [['Title', 'URL', 'Date', 'AddedBy', 'Notes']]
            })
          }
        );
      }
      
      return teamSheet;
    } catch (error) {
      console.error('Error ensuring team sheet:', error);
      throw new Error('Failed to create team sheet');
    }
  }
  
  /**
   * Find or create a sheet
   */
  async findOrCreateSheet(sheetName) {
    try {
      // Check if sheet exists
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}?fields=sheets.properties`,
        {
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get spreadsheet info');
      }
      
      const data = await response.json();
      let sheetExists = false;
      let sheetId = 0;
      
      if (data.sheets) {
        for (const sheet of data.sheets) {
          if (sheet.properties && sheet.properties.title === sheetName) {
            sheetExists = true;
            sheetId = sheet.properties.sheetId;
            break;
          }
        }
      }
      
      // If sheet doesn't exist, create it
      if (!sheetExists) {
        const createResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName
                    }
                  }
                }
              ]
            })
          }
        );
        
        if (!createResponse.ok) {
          throw new Error('Failed to create sheet: ' + createResponse.statusText);
        }
        
        return { sheetName, isNew: true };
      }
      
      return { sheetName, sheetId, isNew: false };
    } catch (error) {
      console.error('Error finding/creating sheet:', error);
      throw error;
    }
  }
  
  /**
   * Join an existing team
   */
  async joinTeam() {
    try {
      const teamCode = document.getElementById('teamCodeInput').value.trim();
      
      if (!teamCode) {
        this.showStatus('Please enter a team code', 'error');
        return;
      }
      
      if (!this.isLoggedIn()) {
        this.showStatus('You need to log in first', 'error');
        return;
      }
      
      // Verify team exists
      const teamInfo = await this.getTeamInfo(teamCode);
      if (!teamInfo) {
        this.showStatus('Invalid team code', 'error');
        return;
      }
      
      // Add user to team
      await this.addUserToTeam(teamCode, this.userEmail, this.userId);
      
      // Save team info
      this.teamId = teamCode;
      this.teamName = teamInfo.teamName;
      
      chrome.storage.local.set({
        teamId: this.teamId,
        teamName: this.teamName
      });
      
      this.updateTeamUI();
      this.showStatus('Joined team successfully', 'success');
      
      // Switch to collaborative mode
      this.setMode('collaborative');
    } catch (error) {
      console.error('Failed to join team:', error);
      this.showStatus('Failed to join team: ' + error.message, 'error');
    }
  }
  
  /**
   * Get team info from team code
   */
  async getTeamInfo(teamCode) {
    try {
      // Check Teams sheet for team
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/Teams!A:B`,
        {
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams data');
      }
      
      const data = await response.json();
      if (!data.values || data.values.length <= 1) {
        return null; // No teams or just headers
      }
      
      // Find team with matching code
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        if (row[0] === teamCode) {
          return {
            teamId: row[0],
            teamName: row[1]
          };
        }
      }
      
      return null; // Team not found
    } catch (error) {
      console.error('Error getting team info:', error);
      throw new Error('Failed to verify team');
    }
  }
  
  /**
   * Verify user's team membership
   */
  async verifyTeamMembership() {
    try {
      if (!this.teamId || !this.userEmail) {
        return false;
      }
      
      // Get team sheet
      const teamSheet = await this.ensureTeamSheet(this.teamId);
      if (!teamSheet) {
        throw new Error('Team sheet not found');
      }
      
      // Get team info
      const teamInfo = await this.getTeamInfo(this.teamId);
      if (!teamInfo) {
        throw new Error('Team not found');
      }
      
      this.teamName = teamInfo.teamName;
      
      // Check user membership
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/Members!A:B`,
        {
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch members data');
      }
      
      const data = await response.json();
      if (!data.values || data.values.length <= 1) {
        return false; // No members or just headers
      }
      
      // Check if user is a member of the team
      let isMember = false;
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        if (row[0] === this.teamId && row[1] === this.userEmail) {
          isMember = true;
          break;
        }
      }
      
      if (!isMember) {
        // User is not a member, clear team info
        this.teamId = null;
        this.teamName = null;
        chrome.storage.local.remove(['teamId', 'teamName']);
        this.updateTeamUI();
      }
      
      return isMember;
    } catch (error) {
      console.error('Error verifying team membership:', error);
      return false;
    }
  }
  
  /**
   * Leave current team
   */
  async leaveTeam() {
    try {
      if (!this.teamId || !this.userEmail) {
        this.showStatus('Not a member of any team', 'error');
        return;
      }
      
      // Remove user from team in Members sheet
      await this.removeUserFromTeam(this.teamId, this.userEmail);
      
      // Clear team info
      this.teamId = null;
      this.teamName = null;
      chrome.storage.local.remove(['teamId', 'teamName']);
      
      this.updateTeamUI();
      this.showStatus('Left team successfully', 'success');
      
      // Switch back to personal mode
      this.setMode('personal');
    } catch (error) {
      console.error('Failed to leave team:', error);
      this.showStatus('Failed to leave team: ' + error.message, 'error');
    }
  }
  
  /**
   * Remove user from team in Members sheet
   */
  async removeUserFromTeam(teamId, userEmail) {
    try {
      // Get all members
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/Members!A:B`,
        {
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch members data');
      }
      
      const data = await response.json();
      if (!data.values || data.values.length <= 1) {
        return; // No members or just headers
      }
      
      // Find row with user's membership
      let rowIndex = -1;
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        if (row[0] === teamId && row[1] === userEmail) {
          rowIndex = i + 1; // 1-indexed in Sheets API
          break;
        }
      }
      
      if (rowIndex === -1) {
        return; // User not found in team
      }
      
      // Delete the row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: 1, // Assuming Members is the second sheet
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1, // 0-indexed in the request
                    endIndex: rowIndex // exclusive
                  }
                }
              }
            ]
          })
        }
      );
    } catch (error) {
      console.error('Error removing user from team:', error);
      throw new Error('Failed to remove from team');
    }
  }
  
  /**
   * Copy team code to clipboard
   */
  copyTeamCode() {
    const teamCodeInput = document.getElementById('currentTeamCode');
    teamCodeInput.select();
    document.execCommand('copy');
    this.showStatus('Team code copied to clipboard', 'success');
  }
  
  /**
   * Save a link in collaborative mode
   */
  async saveLinkCollaborative(link) {
    try {
      if (!this.teamId || !this.userEmail) {
        throw new Error('Not a member of any team');
      }
      
      // Make sure we're authenticated
      if (!window.sheetsApi || !window.sheetsApi.accessToken) {
        throw new Error('Not authenticated with Google');
      }
      
      const sheetName = `Team_${this.teamId}`;
      
      // Add link to team sheet
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[
              link.title || '',
              link.url,
              link.date,
              this.userEmail,
              ''  // Empty notes column
            ]]
          })
        }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving link to team sheet:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to save link to team' 
      };
    }
  }
  
  /**
   * Get all links for the current team
   */
  async getTeamLinks() {
    try {
      if (!this.teamId) {
        return [];
      }
      
      const sheetName = `Team_${this.teamId}`;
      
      // Get links from team sheet
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${window.sheetsApi.sheetId}/values/${sheetName}!A:D`,
        {
          headers: {
            'Authorization': `Bearer ${window.sheetsApi.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch team links');
      }
      
      const data = await response.json();
      if (!data.values || data.values.length <= 1) {
        return []; // No links or just headers
      }
      
      // Convert to link objects
      const links = [];
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        links.push({
          title: row[0] || '',
          url: row[1] || '',
          date: row[2] || '',
          addedBy: row[3] || ''
        });
      }
      
      return links;
    } catch (error) {
      console.error('Error getting team links:', error);
      return [];
    }
  }
  
  /**
   * Generate a unique team ID
   */
  generateTeamId() {
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
  }
  
  /**
   * Show status message using the main status function
   */
  showStatus(message, type) {
    if (typeof window.showStatus === 'function') {
      window.showStatus(message, type);
    } else {
      console.log(`Status (${type}): ${message}`);
    }
  }
}

// Initialize collaborative mode
window.collaborativeMode = new CollaborativeMode();

// Set up event listener for when page is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait for sheets API to be available
  const waitForSheetsApi = setInterval(() => {
    if (window.sheetsApi) {
      clearInterval(waitForSheetsApi);
      window.collaborativeMode.initialize();
    }
  }, 100);
});