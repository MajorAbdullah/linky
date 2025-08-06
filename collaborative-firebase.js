/**
 * Collaborative mode functionality for Linky extension using Firebase
 * Allows users to share links with team members
 */

class FirebaseCollaborativeMode {
  constructor() {
    this.currentMode = 'personal'; // 'personal' or 'collaborative'
    this.teamId = null;
    this.teamName = null;
    
    // Load saved mode and team info
    chrome.storage.local.get(['currentMode', 'teamId', 'teamName'], result => {
      this.currentMode = result.currentMode || 'personal';
      this.teamId = result.teamId || null;
      this.teamName = result.teamName || null;
      
      // Initialize UI based on loaded data
      this.updateModeUI();
      this.updateTeamUI();
    });
    
    // Listen for Firebase authentication state changes
    document.addEventListener('firebase-ready', (event) => {
      console.log('Firebase is ready, updating UI');
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
    
    // Authentication buttons
    document.getElementById('loginForCollab').addEventListener('click', () => this.showLoginForm());
    document.getElementById('loginAnonymously').addEventListener('click', () => this.loginAnonymously());
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    document.getElementById('emailLoginBtn').addEventListener('click', () => this.loginWithEmail());
    document.getElementById('createAccountBtn').addEventListener('click', () => this.createAccount());
    
    // Form toggles
    document.getElementById('showLoginForm').addEventListener('click', () => this.toggleAuthForms('login'));
    document.getElementById('showSignupForm').addEventListener('click', () => this.toggleAuthForms('signup'));
  }
  
  /**
   * Show login form
   */
  showLoginForm() {
    document.getElementById('authForms').style.display = 'block';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
  }
  
  /**
   * Toggle between login and signup forms
   */
  toggleAuthForms(form) {
    if (form === 'login') {
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('signupForm').style.display = 'none';
    } else {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('signupForm').style.display = 'block';
    }
  }
  
  /**
   * Login with email and password
   */
  async loginWithEmail() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      this.showStatus('Please enter both email and password', 'error');
      return;
    }
    
    try {
      this.showStatus('Logging in...', 'info');
      const result = await window.firebaseApi.loginWithEmail(email, password);
      
      if (result.success) {
        document.getElementById('authForms').style.display = 'none';
        this.updateTeamUI();
        this.showStatus('Successfully logged in', 'success');
      } else {
        this.showStatus('Login failed: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showStatus('Login failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Create a new account
   */
  async createAccount() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!email || !password) {
      this.showStatus('Please enter both email and password', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      this.showStatus('Passwords do not match', 'error');
      return;
    }
    
    try {
      this.showStatus('Creating account...', 'info');
      const result = await window.firebaseApi.createAccount(email, password);
      
      if (result.success) {
        document.getElementById('authForms').style.display = 'none';
        this.updateTeamUI();
        this.showStatus('Account created successfully', 'success');
      } else {
        this.showStatus('Failed to create account: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Account creation error:', error);
      this.showStatus('Failed to create account: ' + error.message, 'error');
    }
  }
  
  /**
   * Login anonymously
   */
  async loginAnonymously() {
    try {
      this.showStatus('Logging in anonymously...', 'info');
      const result = await window.firebaseApi.loginAnonymously();
      
      if (result.success) {
        this.updateTeamUI();
        this.showStatus('Logged in anonymously', 'success');
      } else {
        this.showStatus('Anonymous login failed: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Anonymous login error:', error);
      this.showStatus('Anonymous login failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Logout
   */
  async logout() {
    try {
      const result = await window.firebaseApi.logout();
      
      if (result.success) {
        // If we're in collaborative mode, switch back to personal
        if (this.currentMode === 'collaborative') {
          this.setMode('personal');
        }
        
        this.updateTeamUI();
        this.showStatus('Logged out successfully', 'success');
      } else {
        this.showStatus('Logout failed: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.showStatus('Logout failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Set the current mode (personal or collaborative)
   */
  setMode(mode) {
    if (mode === 'collaborative' && !this.isLoggedIn()) {
      this.showStatus('You need to log in to use collaborative mode', 'error');
      this.showLoginForm();
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
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const logoutBtnContainer = document.getElementById('logoutBtnContainer');
    
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
      logoutBtnContainer.style.display = 'block';
      
      // Display user email or anonymous
      const user = window.firebaseApi.getCurrentUser();
      userEmailDisplay.textContent = user.email || 'Anonymous User';
      
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
      logoutBtnContainer.style.display = 'none';
    }
  }
  
  /**
   * Check if user is logged in to Firebase
   */
  isLoggedIn() {
    return window.firebaseApi && window.firebaseApi.isLoggedIn();
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
      
      // Get team name from input or use default
      const teamNameInput = document.getElementById('newTeamName');
      const teamName = (teamNameInput && teamNameInput.value.trim()) 
        ? teamNameInput.value.trim() 
        : 'My Team ' + new Date().toLocaleDateString();
      
      this.showStatus('Creating team...', 'info');
      const result = await window.firebaseApi.createTeam(teamName);
      
      if (result.success) {
        this.teamId = result.teamId;
        this.teamName = result.teamName;
        
        // Save team info
        chrome.storage.local.set({
          teamId: this.teamId,
          teamName: this.teamName
        });
        
        this.updateTeamUI();
        this.showStatus('Team created successfully', 'success');
        
        // Switch to collaborative mode
        this.setMode('collaborative');
      } else {
        this.showStatus('Failed to create team: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      this.showStatus('Failed to create team: ' + error.message, 'error');
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
        this.showLoginForm();
        return;
      }
      
      this.showStatus('Joining team...', 'info');
      const result = await window.firebaseApi.joinTeam(teamCode);
      
      if (result.success) {
        this.teamId = result.teamId;
        this.teamName = result.teamName;
        
        // Save team info
        chrome.storage.local.set({
          teamId: this.teamId,
          teamName: this.teamName
        });
        
        this.updateTeamUI();
        this.showStatus('Joined team successfully', 'success');
        
        // Switch to collaborative mode
        this.setMode('collaborative');
      } else {
        this.showStatus('Failed to join team: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to join team:', error);
      this.showStatus('Failed to join team: ' + error.message, 'error');
    }
  }
  
  /**
   * Leave current team
   */
  async leaveTeam() {
    try {
      if (!this.teamId) {
        this.showStatus('Not a member of any team', 'error');
        return;
      }
      
      this.showStatus('Leaving team...', 'info');
      const result = await window.firebaseApi.leaveTeam(this.teamId);
      
      if (result.success) {
        // Clear team info
        this.teamId = null;
        this.teamName = null;
        chrome.storage.local.remove(['teamId', 'teamName']);
        
        this.updateTeamUI();
        this.showStatus('Left team successfully', 'success');
        
        // Switch back to personal mode
        this.setMode('personal');
      } else {
        this.showStatus('Failed to leave team: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to leave team:', error);
      this.showStatus('Failed to leave team: ' + error.message, 'error');
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
      if (!this.teamId) {
        throw new Error('Not a member of any team');
      }
      
      if (!this.isLoggedIn()) {
        throw new Error('Not logged in');
      }
      
      const result = await window.firebaseApi.saveLinkToTeam(this.teamId, link);
      
      return result;
    } catch (error) {
      console.error('Error saving link to team:', error);
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
      
      const result = await window.firebaseApi.getTeamLinks(this.teamId);
      
      if (result.success) {
        return result.links;
      } else {
        console.error("Error getting team links:", result.error);
        return [];
      }
    } catch (error) {
      console.error('Error getting team links:', error);
      return [];
    }
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
window.collaborativeMode = new FirebaseCollaborativeMode();

// Set up event listener for when page is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Firebase API to be available
  const waitForFirebaseApi = setInterval(() => {
    if (window.firebaseApi) {
      clearInterval(waitForFirebaseApi);
      window.collaborativeMode.initialize();
    }
  }, 100);
});