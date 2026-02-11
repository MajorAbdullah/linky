# Linky -- URL Bookmark Manager

**A Chrome extension for saving, managing, and collaborating on bookmarked links**

Linky lets you save the current tab's URL with a single click and keep all your bookmarks organized in one place. It goes beyond basic bookmarking by integrating with Google Sheets for automatic link syncing and Firebase Realtime Database for real-time team collaboration.

---

## Tech Stack

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-API-0F9D58?style=for-the-badge&logo=googlesheets&logoColor=white)

---

## Features

### Core Features
- **One-Click Bookmarking** -- save the current tab's URL and title instantly
- **Link Management** -- view all saved links in an organized, scrollable list
- **Bulk Delete** -- select and remove multiple saved links at once via the settings panel
- **CSV Export** -- download all saved links as a dated CSV file
- **Duplicate Prevention** -- automatically skips URLs that are already saved
- **Date Tracking** -- each link records the date it was saved

### Google Sheets Integration
- **Automatic Sync** -- every saved link is simultaneously added to a connected Google Sheet
- **OAuth 2.0 Authentication** -- secure access using Chrome's identity API
- **Auto-Setup** -- creates a "Links" sheet with column headers (Title, URL, Date, Notes) if it does not exist
- **Connect / Disconnect** -- easily link or unlink a Google Sheet from the settings panel

### Team Collaboration (Firebase)
- **Real-Time Shared Links** -- team members see each other's saved links instantly
- **Team Management** -- create a new team or join an existing one with a team code
- **User Attribution** -- each shared link shows who added it and when
- **Personal / Collaborative Mode Toggle** -- switch between personal bookmarks and team links
- **Configurable Firebase** -- enter your own Firebase project credentials directly in the extension settings
- **Email and Anonymous Login** -- flexible authentication options for team members

---

## Installation

### From Source

1. Clone or download this repository:
   ```bash
   git clone https://github.com/MajorAbdullah/linky.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked** and select the `linky` folder
5. The Linky icon will appear in your browser toolbar

---

## Usage

### Saving Links
1. Navigate to any webpage you want to save
2. Click the Linky icon in your browser toolbar
3. Click the **Save Current URL** button
4. The link is saved locally and appears in your list (and syncs to Google Sheets / team if connected)

### Managing Links
1. Click the Linky icon to open the popup
2. All saved links are displayed in a scrollable list -- click any link to open it in a new tab
3. Click the settings icon to access the management panel for bulk deletion

### Exporting Links as CSV
1. In the main popup view, click the **Download CSV** button
2. A CSV file named `linky_saved_links_YYYY-MM-DD.csv` is downloaded with all your saved links

### Setting Up Google Sheets Integration
1. Create a Google Sheet or use an existing one (ensure it is shared with edit permissions)
2. Copy the Sheet URL
3. In the extension settings panel, paste the URL and click **Connect**
4. Authorize the extension when prompted
5. All future saved links will be synced to the sheet automatically

### Setting Up Firebase for Team Collaboration
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable **Realtime Database** (start in test mode)
3. Enable **Authentication** (Email/Password)
4. Register a web app and copy the configuration values
5. In the Linky settings panel, go to the **Firebase** tab and fill in:
   - Project API Key
   - Auth Domain
   - Project ID
   - App ID
   - Database URL
6. Click **Save Configuration** -- the extension will reload with Firebase enabled
7. Switch to **Collaborative** mode, log in, and create or join a team

---

## File Structure

```
linky/
├── manifest.json              # Chrome extension manifest (v3)
├── popup.html                 # Popup UI structure
├── popup.js                   # Main popup logic (save, display, manage links)
├── background.js              # Service worker for extension initialization
├── sheets-api.js              # Google Sheets API integration
├── firebase-api.js            # Firebase initialization and configuration
├── collaborative-firebase.js  # Team collaboration features (create/join teams, shared links)
├── collaborative.js           # Collaboration mode toggle logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   ├── settings.png
│   └── settings.svg
└── README.md
```

---

## Permissions

| Permission | Purpose |
|-----------|---------|
| `activeTab` | Access current tab URL and title for bookmarking |
| `storage` | Persist saved links and configuration in Chrome local storage |
| `identity` | OAuth 2.0 authentication for Google Sheets API |
| `sheets.googleapis.com` | Read/write access to connected Google Sheets |
| `*.firebaseio.com` | Firebase Realtime Database for team collaboration |
| `identitytoolkit.googleapis.com` | Firebase Authentication |

---

## Troubleshooting

### Google Sheets Connection Fails
- Verify the Google Sheet is shared with edit permissions
- Confirm you are signed into Chrome with the same Google account that owns or has access to the sheet
- Make sure you granted permissions when the OAuth prompt appeared

### Firebase Configuration Issues
- Ensure all required fields (API Key, Auth Domain, Project ID, App ID, Database URL) are filled correctly
- Verify that the Firebase Realtime Database has been created and is accessible
- Check that Authentication is enabled for Email/Password in the Firebase console

### Links Not Saving
- The extension prevents duplicate URLs -- verify the link is not already saved
- Ensure sufficient browser storage space is available

---

## License

MIT License -- feel free to use, modify, and distribute.

## Author

**Syed Abdullah Shah** -- [@MajorAbdullah](https://github.com/MajorAbdullah)
