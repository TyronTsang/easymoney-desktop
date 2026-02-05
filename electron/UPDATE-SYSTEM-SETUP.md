# EasyMoneyLoans - Auto-Update System Setup Guide

## Overview
The app now includes an automatic update system that allows branches to check for and install updates directly from within the application. Updates are distributed securely via GitHub Releases.

---

## ⚙️ Initial Setup (One-Time Configuration)

### Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and log in
2. Click the "+" button (top right) → "New repository"
3. Repository settings:
   - **Name**: `easymoney-desktop` (or any name you prefer)
   - **Description**: "EasyMoneyLoans Desktop Application"
   - **Visibility**: Choose **Private** (recommended for internal software)
   - Click "Create repository"

4. Copy your repository name format: `your-username/easymoney-desktop`
   - Example: If your username is `johndoe`, it's `johndoe/easymoney-desktop`

### Step 2: Update the App Configuration

1. Open `/app/electron/main.js`
2. Find lines 11-12:
   ```javascript
   const APP_VERSION = '1.0.0';
   const GITHUB_REPO = 'yourusername/easymoney-desktop';
   ```
3. Replace `yourusername/easymoney-desktop` with YOUR repository name
   - Example: `const GITHUB_REPO = 'johndoe/easymoney-desktop';`

---

## 📦 Releasing Updates (When You Make Changes)

### Step 1: Update Version Number

Before building, update the version in `/app/electron/package.json` and `/app/electron/main.js`:

**In `/app/electron/package.json`:**
```json
{
  "version": "1.0.1"  // Increment this (1.0.0 → 1.0.1 → 1.0.2, etc.)
}
```

**In `/app/electron/main.js`:**
```javascript
const APP_VERSION = '1.0.1';  // Match package.json version
```

### Step 2: Build the New .EXE

1. Open Command Prompt in the `/app/electron` folder
2. Run the build command:
   ```bash
   npm run build
   ```
3. Wait for the build to complete
4. Find your `.exe` file in `/app/electron/dist/`
   - Example: `EasyMoneyLoans Setup 1.0.1.exe`

### Step 3: Create a GitHub Release

1. Go to your GitHub repository
2. Click "Releases" (right sidebar)
3. Click "Create a new release"
4. Fill in the release details:

   **Tag version**: `v1.0.1` (must start with 'v' and match your version)
   
   **Release title**: `Version 1.0.1` (or descriptive name like "Bug Fixes & Improvements")
   
   **Description** (changelog):
   ```markdown
   ## What's New in v1.0.1
   
   ### 🐛 Bug Fixes
   - Fixed payment marking error
   - Fixed loan creation dialog scrolling
   
   ### ✨ Improvements
   - Added loan amount validation (R400-R8000)
   - Added folder selection for exports and backups
   
   ### 🔒 Security
   - Improved error handling
   ```

5. Attach your `.exe` file:
   - Drag and drop your `.exe` from `/app/electron/dist/` into the attachments area
   - Or click "Attach binaries by dropping them here or selecting them"

6. Click "Publish release"

---

## 👥 How Branches Get Updates

### For Branch Staff:

1. Open the EasyMoneyLoans app
2. Go to **Admin Panel** → **Updates** tab
3. Click **"Check for Updates"**
4. If an update is available:
   - They'll see the new version number
   - Read the changelog (what's new)
   - Click **"Download Update"**
   - Wait for download to complete
   - Click **"Install & Restart"**
5. The app will close, install the update, and restart automatically
6. Done! They're now on the latest version

---

## 🔐 Security Notes

### GitHub Token (For Private Repositories)

If you made your repository **private**, you'll need to provide an access token for the app to check for updates:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "EasyMoneyLoans Update Checker"
4. Select scope: **`repo`** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)
7. Update `/app/electron/updater.js` line 23 to include authentication:
   ```javascript
   headers: {
     'User-Agent': 'EasyMoneyLoans-Desktop',
     'Authorization': 'token YOUR_GITHUB_TOKEN_HERE'  // Add this line
   }
   ```

⚠️ **Important**: Never commit your token to Git. Use environment variables or config files.

### Code Signing (Recommended)

For production, you should sign your `.exe` files:
- Prevents Windows security warnings
- Shows your company name as verified publisher
- Costs ~$100-400/year from providers like:
  - Sectigo
  - DigiCert
  - Comodo

Without signing, Windows will show "Unknown Publisher" warnings (users can still install).

---

## 📋 Version Numbering Guide

Use **Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x): Breaking changes, major new features
- **MINOR** (x.1.x): New features, improvements
- **PATCH** (x.x.1): Bug fixes, small tweaks

Examples:
- `1.0.0` → Initial release
- `1.0.1` → Bug fixes
- `1.1.0` → New features added
- `2.0.0` → Major redesign

---

## ✅ Testing the Update System

### Test Locally Before Releasing:

1. Build version 1.0.1
2. Create a GitHub release with the .exe
3. In your development environment:
   - Make sure `GITHUB_REPO` in `main.js` points to your repo
   - Open the app
   - Go to Admin Panel → Updates
   - Click "Check for Updates"
4. You should see the update available dialog
5. Test the download and install process

---

## 🆘 Troubleshooting

### "No releases found on GitHub"
- Make sure you created a release (not just uploaded a file)
- Check that the release is published (not draft)
- Verify the repository name in `main.js` matches your GitHub repo

### "No .exe file found in latest release"
- Make sure you attached the `.exe` file to the GitHub release
- The file must have `.exe` extension

### Download fails
- Check your internet connection
- If using private repo, verify GitHub token is correct
- Check that the .exe file size isn't too large

### Update doesn't appear
- Verify version numbers are correct
- New version must be HIGHER than current version
- Check that tag format is `v1.0.1` (with 'v' prefix)

---

## 📞 Support

If branches encounter issues:
1. Check their internet connection
2. Verify they're logged in as Admin
3. Try "Check for Updates" again
4. If persistent, manually distribute the .exe

---

## 🎯 Quick Reference

**Build command**: `npm run build`
**Location of .exe**: `/app/electron/dist/`
**Version files to update**: `/app/electron/package.json` and `/app/electron/main.js`
**Release naming**: Tag must be `v1.0.1` format (with 'v')

---

**Last Updated**: 2025-01-31
