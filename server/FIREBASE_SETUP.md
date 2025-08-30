# 🔥 Firebase Configuration Guide

## Step 1: Get Firebase Service Account Key

1. **Go to Firebase Console**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Select your project** (or create one if needed)
3. **Project Settings** → Click the gear icon ⚙️ next to "Project Overview"
4. **Service Accounts Tab** → Click "Service accounts"
5. **Generate New Private Key** → Click "Generate new private key"
6. **Download JSON** → Save the file (contains your Firebase credentials)

## Step 2: Update Your .env File

Add these environment variables to your `server/.env` file:

```bash
# Firebase Configuration
FIREBASE_TYPE="service_account"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your-client-id"
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"

# Optional: Database URL (not required for Firestore)
# FIREBASE_DATABASE_URL="https://your-project-id.firebaseio.com"
```

## Step 3: Copy Values from Service Account JSON

Open the downloaded JSON file and copy these values:

- `type` → `FIREBASE_TYPE`
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the \n characters)
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `client_id` → `FIREBASE_CLIENT_ID`
- `auth_uri` → `FIREBASE_AUTH_URI`
- `token_uri` → `FIREBASE_TOKEN_URI`
- `auth_provider_x509_cert_url` → `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `client_x509_cert_url` → `FIREBASE_CLIENT_X509_CERT_URL`

## Step 4: Database URL (Optional)

**For Firestore (recommended)**: You don't need a database URL. Your application uses Firestore, which is automatically configured.

**For Realtime Database (legacy)**: If you want to use the older Firebase Realtime Database, you can add:
```bash
FIREBASE_DATABASE_URL="https://your-project-id.firebaseio.com"
```

Replace `your-project-id` with your actual project ID.

## Step 5: Run the Migration

Once Firebase is configured, run:

```bash
cd server
node scripts/migrate.js
```

## Troubleshooting

### Common Issues:

1. **"Firebase credentials not found"**
   - Make sure all environment variables are set in `.env`
   - Check that the private key includes `\n` characters

2. **"Invalid private key"**
   - Ensure the private key is properly formatted with newlines
   - Copy the exact value from the JSON file

3. **"Project not found"**
   - Verify your `FIREBASE_PROJECT_ID` matches your Firebase project
   - Check that your service account has the correct permissions

### Verify Configuration:

After setting up, restart your server and check the console for:
```
✅ Firebase Admin initialized successfully
```

If you see this message, Firebase is properly configured!
