/**
 * Firebase API integration for Linky extension
 * Provides authentication and database functionality
 */

class FirebaseAPI {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.user = null;
    this.isInitialized = false;
    
    // Default empty Firebase configuration
    this.firebaseConfig = {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
      databaseURL: ""
    };
    
    // Load config from storage if available
    chrome.storage.local.get(['firebaseConfig'], result => {
      if (result.firebaseConfig) {
        this.firebaseConfig = result.firebaseConfig;
        console.log("Firebase config loaded from storage");
        // Load scripts after we have the config
        this.loadFirebaseScripts();
      } else {
        console.log("No Firebase config found in storage");
        // Load scripts anyway to make API available, but init will fail without config
        this.loadFirebaseScripts();
      }
    });
  }
  
  /**
   * Set Firebase configuration and save to storage
   */
  setConfig(config) {
    try {
      // Validate the config has required fields
      if (!config.apiKey || !config.projectId) {
        return { 
          success: false, 
          error: "Firebase configuration is incomplete. API Key and Project ID are required." 
        };
      }
      
      this.firebaseConfig = config;
      
      // Save to storage
      chrome.storage.local.set({ firebaseConfig: config });
      
      // If Firebase was already initialized, we need to reinitialize it
      if (this.app) {
        // Delete the old app
        this.app.delete().then(() => {
          // Reinitialize with new config
          this.initializeFirebase();
        });
      } else {
        // Initialize for the first time
        this.initializeFirebase();
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error setting Firebase config:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get a safe version of Firebase config for display purposes
   * Masks sensitive values like API keys
   */
  getDisplayConfig() {
    // Check if we have any config at all
    if (!this.firebaseConfig || !this.firebaseConfig.projectId) {
      return { configured: false };
    }
    
    return {
      configured: true,
      projectId: this.firebaseConfig.projectId,
      authDomain: this.firebaseConfig.authDomain,
      storageBucket: this.firebaseConfig.storageBucket || null,
      databaseURL: this.firebaseConfig.databaseURL || null
    };
  }
  
  /**
   * Update Firebase configuration
   * If a reload is needed, the function will return { success: true, message: 'reload-needed' }
   */
  async updateConfig(config) {
    try {
      // Validate the config has required fields
      if (!config.apiKey || !config.projectId || !config.authDomain || !config.appId || !config.databaseURL) {
        return { 
          success: false, 
          error: "Firebase configuration is incomplete. Required fields are missing." 
        };
      }
      
      // Save the new config
      this.firebaseConfig = config;
      chrome.storage.local.set({ firebaseConfig: config });
      
      // If Firebase has never been initialized before
      if (!this.isInitialized) {
        // We may need to reload the extension if this is the first time setting up Firebase
        // This is because Firebase scripts didn't load properly initially
        return { 
          success: true, 
          message: 'reload-needed'  
        };
      }
      
      // If Firebase was already initialized, reinitialize it
      if (this.app) {
        try {
          await this.app.delete();
        } catch (err) {
          console.error("Error deleting Firebase app:", err);
          // Continue anyway
        }
      }
      
      // Initialize Firebase with new config
      this.initializeFirebase();
      
      return { success: true };
    } catch (error) {
      console.error("Error updating Firebase config:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if Firebase is properly configured
   */
  isConfigured() {
    return !!(this.firebaseConfig && this.firebaseConfig.apiKey && this.firebaseConfig.projectId);
  }
  
  /**
   * Get current Firebase configuration
   */
  getConfig() {
    return this.firebaseConfig;
  }
  
  /**
   * Load Firebase scripts dynamically
   */
  loadFirebaseScripts() {
    // Don't load scripts if no config is available
    if (!this.firebaseConfig) {
      console.log('No Firebase config available, skipping script loading');
      return;
    }
    
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.10/firebase-database-compat.js'
    ];
    
    let loadedCount = 0;
    
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        loadedCount++;
        
        // Initialize Firebase once all scripts are loaded
        if (loadedCount === scripts.length) {
          this.initializeFirebase();
        }
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Initialize Firebase
   */
  initializeFirebase() {
    try {
      // Check if we have the necessary configuration
      if (!this.isConfigured()) {
        console.warn("Firebase is not properly configured. Authentication and database features will not work.");
        
        // Dispatch event so other components know Firebase is ready but not configured
        const event = new CustomEvent('firebase-ready', { detail: { configured: false } });
        document.dispatchEvent(event);
        return;
      }
      
      // Initialize Firebase app
      this.app = firebase.initializeApp(this.firebaseConfig);
      this.auth = firebase.auth();
      this.db = firebase.database();
      this.isInitialized = true;
      
      // Check if user is already logged in
      this.auth.onAuthStateChanged(user => {
        this.user = user;
        
        // Dispatch event so other components know Firebase is ready
        const event = new CustomEvent('firebase-ready', { detail: { user, configured: true } });
        document.dispatchEvent(event);
      });
      
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }
  
  /**
   * Login with email and password
   */
  async loginWithEmail(email, password) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      this.user = userCredential.user;
      return { success: true, user: this.user };
    } catch (error) {
      console.error("Error logging in:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create account with email and password
   */
  async createAccount(email, password) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      this.user = userCredential.user;
      return { success: true, user: this.user };
    } catch (error) {
      console.error("Error creating account:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Login anonymously - useful for quick team joining
   */
  async loginAnonymously() {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      const userCredential = await this.auth.signInAnonymously();
      this.user = userCredential.user;
      return { success: true, user: this.user };
    } catch (error) {
      console.error("Error with anonymous login:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Logout current user
   */
  async logout() {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      await this.auth.signOut();
      this.user = null;
      return { success: true };
    } catch (error) {
      console.error("Error logging out:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }
  
  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.user;
  }
  
  /**
   * Create a new team
   */
  async createTeam(teamName) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      // Generate a unique team ID
      const teamId = this.generateTeamId();
      
      // Get user info for the team
      const userEmail = this.user.email || 'anonymous';
      const userId = this.user.uid;
      
      // Create team in database
      await this.db.ref(`teams/${teamId}`).set({
        teamName: teamName,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: userId
      });
      
      // Add user as team member
      await this.db.ref(`team_members/${teamId}/${userId}`).set({
        email: userEmail,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        role: 'admin' // First user is admin
      });
      
      return {
        success: true,
        teamId: teamId,
        teamName: teamName
      };
    } catch (error) {
      console.error("Error creating team:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Join an existing team
   */
  async joinTeam(teamId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      // Check if team exists
      const teamSnapshot = await this.db.ref(`teams/${teamId}`).once('value');
      const teamData = teamSnapshot.val();
      
      if (!teamData) {
        throw new Error("Team not found");
      }
      
      // Get user info
      const userEmail = this.user.email || 'anonymous';
      const userId = this.user.uid;
      
      // Add user as team member
      await this.db.ref(`team_members/${teamId}/${userId}`).set({
        email: userEmail,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        role: 'member'
      });
      
      return {
        success: true,
        teamId: teamId,
        teamName: teamData.teamName
      };
    } catch (error) {
      console.error("Error joining team:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Leave a team
   */
  async leaveTeam(teamId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      // Remove user from team members
      await this.db.ref(`team_members/${teamId}/${this.user.uid}`).remove();
      
      return { success: true };
    } catch (error) {
      console.error("Error leaving team:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Save a link to team
   */
  async saveLinkToTeam(teamId, link) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      // Check if user is a team member
      const memberSnapshot = await this.db.ref(`team_members/${teamId}/${this.user.uid}`).once('value');
      if (!memberSnapshot.exists()) {
        throw new Error("Not a member of this team");
      }
      
      // Create link object with additional metadata
      const linkData = {
        ...link,
        addedBy: this.user.email || this.user.uid,
        addedAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Add link to team links
      const newLinkRef = this.db.ref(`team_links/${teamId}`).push();
      await newLinkRef.set(linkData);
      
      return { success: true, linkId: newLinkRef.key };
    } catch (error) {
      console.error("Error saving link to team:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all links for a team
   */
  async getTeamLinks(teamId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      // Check if team exists
      const teamSnapshot = await this.db.ref(`teams/${teamId}`).once('value');
      if (!teamSnapshot.exists()) {
        throw new Error("Team not found");
      }
      
      // Get all links for the team
      const linksSnapshot = await this.db.ref(`team_links/${teamId}`).once('value');
      const linksData = linksSnapshot.val() || {};
      
      // Convert to array format
      const links = Object.keys(linksData).map(key => ({
        id: key,
        ...linksData[key]
      }));
      
      return { success: true, links };
    } catch (error) {
      console.error("Error getting team links:", error);
      return { success: false, error: error.message, links: [] };
    }
  }
  
  /**
   * Get team info
   */
  async getTeamInfo(teamId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Firebase not initialized yet");
      }
      
      // Get team data
      const teamSnapshot = await this.db.ref(`teams/${teamId}`).once('value');
      const teamData = teamSnapshot.val();
      
      if (!teamData) {
        throw new Error("Team not found");
      }
      
      // Get team members
      const membersSnapshot = await this.db.ref(`team_members/${teamId}`).once('value');
      const membersData = membersSnapshot.val() || {};
      
      const members = Object.keys(membersData).map(key => ({
        userId: key,
        ...membersData[key]
      }));
      
      return {
        success: true,
        teamId,
        teamName: teamData.teamName,
        createdAt: teamData.createdAt,
        createdBy: teamData.createdBy,
        members
      };
    } catch (error) {
      console.error("Error getting team info:", error);
      return { success: false, error: error.message };
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
}

// Create global instance
window.firebaseApi = new FirebaseAPI();