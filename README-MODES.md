# 4STROKES - Usage Modes

This app supports two modes of operation:

## Local Storage Mode (No Login Required)

**Best for:**
- Quick personal use
- No internet connection
- Privacy-conscious users
- Testing and development

**Features:**
- Data stored in browser localStorage
- Works offline
- No account required
- Data stays on your device

**Limitations:**
- Data only available on current browser/device
- Clearing browser data will delete your notes
- Cannot sync across devices

**How to use:**
1. Open the app
2. Click "Continue with Local Storage"
3. Start using immediately

---

## Online Mode (Firebase Cloud Storage)

**Best for:**
- Access from multiple devices
- Team collaboration
- Long-term storage
- Cloud backup

**Features:**
- Data synced to cloud (Firebase Firestore)
- Access from any device
- Persistent storage
- Google account integration

**Requirements:**
- Internet connection
- Google account or email/password registration

**How to use:**
1. Open the app
2. Click "Sign in with Google" or create account
3. Your data syncs automatically

---

## Switching Between Modes

### From Local to Online:
1. In main app, click "ONLINE MODE" button
2. Login with your account
3. Your local data will be migrated to cloud (first time only)

### From Online to Local:
1. Click "LOGOUT"
2. Choose "Continue with Local Storage"
3. Note: Cloud data will not be automatically downloaded

---

## Data Migration

**Local → Online (automatic):**
When you login for the first time, your local data is automatically migrated to Firestore.

**Online → Local (manual):**
Currently not supported. Data remains in cloud only.

---

## FAQ

**Q: Can I use both modes?**
A: Yes, but they maintain separate data. Switching modes does not automatically sync data between them.

**Q: What happens if I clear my browser data in local mode?**
A: All your data will be lost. Consider switching to online mode for backup.

**Q: Is my data safe in local mode?**
A: Data is stored in your browser. It's as safe as your device, but not backed up.

**Q: Do I need to configure Firebase?**
A: Only if you want to use online mode. Local mode works without any configuration.

**Q: Can I export my data?**
A: Currently not supported. Feature planned for future release.

---

## Recommended Setup

**For developers/testing:**
1. Use local mode during development
2. No Firebase setup needed
3. Fast and simple

**For production use:**
1. Configure Firebase (see SETUP.md)
2. Use online mode for cloud sync
3. Better data persistence

---

Last updated: 2025-11-09
