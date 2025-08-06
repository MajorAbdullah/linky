# Linky - URL Bookmark Manager Chrome Extension

## Overview
Linky is a Chrome extension that helps you save and manage links from websites you visit. It provides a simple way to bookmark URLs with just one click and offers convenient features like Google Sheets integration and CSV export.

## Features

### Core Features
- **One-Click Bookmarking**: Save the current tab's URL and title with a single click
- **Link Management**: View all your saved links in an organized list
- **Bulk Delete**: Select and delete multiple saved links at once
- **CSV Export**: Download all your saved links as a CSV file
- **Google Sheets Integration**: Automatically sync saved links to a Google Spreadsheet
- **Team Collaboration**: Share links with team members using Firebase integration

### Technical Features
- Stores links locally in Chrome's storage
- Uses OAuth 2.0 for secure Google Sheets authentication
- Firebase integration for collaborative features
- Responsive popup interface with settings panel
- Automatic duplicate prevention

## Installation

### From Source Code
1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the downloaded `linky` folder
5. The Linky icon should now appear in your browser's toolbar

## How to Use

### Saving Links
1. Navigate to any webpage you want to save
2. Click the Linky icon in your browser toolbar
3. Click the "Save Current URL" button
4. The link is now saved locally and will appear in your list

### Managing Links
1. Click the Linky icon to open the extension popup
2. All your saved links will be displayed in a scrollable list
3. Click on any link to open it in a new tab
4. Click the settings icon (⚙️) to access link management features

### Deleting Links
1. In the extension popup, click the settings icon
2. Check the boxes next to the links you want to delete
3. Click the "Delete Selected" button
4. The selected links will be permanently removed

### Exporting Links as CSV
1. In the main view of the extension, click the "Download CSV" button
2. A CSV file containing all your saved links will be downloaded
3. The file will be named "linky_saved_links_YYYY-MM-DD.csv" with the current date

### Google Sheets Integration

#### Setting Up Google Sheets Integration
1. Create a Google Sheet or use an existing one
2. Make sure the sheet is shared with edit permissions
3. Copy the URL of your Google Sheet
4. In the extension, click the settings icon
5. Paste your Google Sheet URL in the text field
6. Click "Connect"
7. When prompted, allow the extension to access your Google Sheets

#### How the Google Sheets Integration Works
1. When you connect a Google Sheet, Linky will:
   - Verify your access permissions
   - Create a "Links" sheet if it doesn't exist
   - Add column headers (Title, URL, Date, Notes)
2. Every time you save a link in Linky:
   - The link is stored locally in Chrome
   - The link is also added to your connected Google Sheet
3. You can disconnect at any time via the settings page

### Firebase Setup for Collaboration Features

#### Creating a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Give your project a name (e.g., "Linky Extension")
4. Enable Google Analytics if you want (optional)
5. Click "Create project"

#### Setting Up Firebase Realtime Database
1. In your Firebase project dashboard, click "Build" in the left sidebar
2. Select "Realtime Database"
3. Click "Create database"
4. Start in test mode (you can adjust security rules later)
5. Choose a database location close to your users

#### Adding Firebase to Linky Extension
1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" and click the web icon (</>) 
4. Register your app with a nickname (e.g., "Linky Extension")
5. Copy the Firebase configuration object (it contains apiKey, authDomain, etc.)

#### Configuring Firebase in Linky Extension
1. Open the Linky extension popup
2. Click the settings icon (⚙️)
3. Go to the "Firebase" tab
4. Fill in the following fields from your Firebase config:
   - Project API Key
   - Auth Domain
   - Project ID
   - App ID
   - Database URL
5. Click "Save Configuration"
6. The extension will update and you'll see "Firebase configured" message

#### Using Team Collaboration
1. Make sure Firebase is configured properly
2. In the main extension view, click "Collaborative" mode
3. Log in with your email or use anonymous login
4. Create a new team or join an existing team with a team code
5. Once in a team, all saved links will be shared with team members

## Technical Details

### File Structure
- `manifest.json`: Extension configuration and permissions
- `popup.html`: UI structure for the extension popup
- `popup.js`: Main JavaScript functionality for user interactions
- `background.js`: Background script for extension initialization
- `sheets-api.js`: Handles Google Sheets API integration
- `firebase-api.js`: Handles Firebase integration for collaboration
- `collaborative-firebase.js`: Implements team collaboration features
- `icons/`: Contains extension icons in various sizes

### Storage
- Links are stored in Chrome's local storage
- Each link contains:
  - URL
  - Page title
  - Date saved
- Team links are stored in Firebase Realtime Database
- Firebase configuration is stored in Chrome's local storage

### Permissions
- `activeTab`: To access current tab information
- `storage`: To store saved links
- `identity`: For Google OAuth authentication
- Access to `sheets.googleapis.com`: For Google Sheets API connectivity
- Access to `*.firebaseio.com` and related domains: For Firebase functionality

## Troubleshooting

### Common Issues

#### Google Sheets Connection Fails
- Make sure the Google Sheet is shared with edit permissions
- Check that you're signed in to Chrome with the same Google account that owns or has access to the sheet
- Verify that you've allowed the necessary permissions when prompted

#### Firebase Configuration Issues
- Ensure all required Firebase configuration fields are filled correctly
- Check that the Firebase Realtime Database is created and accessible
- Verify that the Firebase project has Authentication enabled for Email/Password
- If team features don't work, check the Firebase console for any error messages

#### Links Not Saving
- Check if the link is already saved (duplicates are prevented)
- Make sure you have sufficient storage space in your browser

## Support and Development
This extension was created as a personal project. Feel free to fork and extend its functionality according to your needs.

## License
MIT License - Feel free to use, modify, and distribute as needed.