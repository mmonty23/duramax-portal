# Duramax Industrial – File Portal
## Complete Setup Guide (Supabase + Netlify + SendGrid)

Everything here is **free** — no credit card required for any service.

---

## WHAT YOU'RE BUILDING

| URL | Who uses it | What it does |
|-----|-------------|--------------|
| `yoursite.com/admin` | You | Create clients, view/delete files, email links |
| `yoursite.com/client` | Your clients | Log in, upload photos, download files |

---

## SERVICES NEEDED

| Service | Cost | What it handles |
|---------|------|-----------------|
| Supabase | Free | Auth + database + file storage |
| Netlify | Free | Web hosting + serverless functions |
| SendGrid | Free | Sending credential emails to clients |

---

## PART 1 — SUPABASE SETUP (~20 min)

### Step 1.1 — Create Account & Project
1. Go to https://supabase.com → click **Start your project**
2. Sign up with GitHub or email
3. Click **New project**
4. Fill in:
   - **Name:** `duramax-portal`
   - **Database Password:** create a strong password and save it somewhere safe
   - **Region:** US East (or closest to you)
5. Click **Create new project** — takes about 2 minutes to provision

### Step 1.2 — Run the Database Schema
1. In your project dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the **entire contents** and paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" — that means it worked

   This creates:
   - `profiles` table (links users to roles and client folders)
   - `clients` table (your client records)
   - `files` table (file metadata)
   - `client-files` storage bucket
   - All security rules (Row Level Security)

### Step 1.3 — Get Your API Keys
1. Left sidebar → **Project Settings** → **API**
2. You need two values — copy them somewhere:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)
   - **service_role key** (another long string — keep this SECRET, never put in browser code)

### Step 1.4 — Create Your Admin Account
1. Left sidebar → **Authentication** → **Users**
2. Click **Add user → Create new user**
3. Email: `info@duramaxpavingllc.com` (or your preferred admin email)
4. Password: create a strong password
5. Check **Auto Confirm User**
6. Click **Create User**
7. Copy the **User UID** shown in the users list (looks like `abc123-def456-...`)

### Step 1.5 — Set Admin Role in Database
1. Left sidebar → **Table Editor**
2. Click the `profiles` table
3. Find the row with your email — it was auto-created when you added the user
4. Click on the row to edit it
5. Change the `role` field from `client` to `admin`
6. Click **Save**

   *(If the row doesn't exist yet: click Insert Row, fill in id=your UID, email=your email, role=admin)*

### Step 1.6 — Configure Storage Bucket
1. Left sidebar → **Storage**
2. You should see a bucket called `client-files` (created by the SQL script)
3. If it's not there: click **New bucket**, name it `client-files`, keep it **Private**
4. Click on `client-files` → **Policies** tab
5. Verify the policies exist (they were created by the SQL script):
   - "Admin full storage access"
   - "Client upload to own folder"
   - "Client read own folder"

---

## PART 2 — SENDGRID SETUP (~10 min)

### Step 2.1 — Create Account
1. Go to https://sendgrid.com → **Start for Free**
2. Sign up — no credit card needed for free tier (100 emails/day)

### Step 2.2 — Verify Your Sender Email
1. Left sidebar → **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in:
   - From Name: `Duramax Industrial Paving & Concrete`
   - From Email: `info@duramaxpavingllc.com`
   - Reply To: same email
   - Fill in your company address
4. Click **Create**
5. Check your email inbox → click the verification link SendGrid sends you

### Step 2.3 — Get API Key
1. Left sidebar → **Settings → API Keys**
2. Click **Create API Key**
3. Name: `duramax-portal`
4. Select **Full Access**
5. Click **Create & View**
6. **Copy the API key immediately** — you cannot view it again
7. Paste it somewhere safe

---

## PART 3 — FILL IN YOUR CONFIG VALUES

You need to replace placeholder values in **3 files**:

### File 1: `public/admin/index.html`
Near the top of the `<script>` block, find and replace:
```
const SUPABASE_URL  = "REPLACE_WITH_YOUR_PROJECT_URL";
const SUPABASE_ANON = "REPLACE_WITH_YOUR_ANON_KEY";
const ADMIN_SECRET  = "REPLACE_WITH_YOUR_ADMIN_SECRET";
```
- `SUPABASE_URL` → your Project URL from Step 1.3
- `SUPABASE_ANON` → your anon/public key from Step 1.3
- `ADMIN_SECRET` → make up a random 20+ character password (e.g. `DX-Portal-2025-Secret!`)

### File 2: `public/client/index.html`
Same section at the top of the `<script>` block:
```
const SUPABASE_URL  = "REPLACE_WITH_YOUR_PROJECT_URL";
const SUPABASE_ANON = "REPLACE_WITH_YOUR_ANON_KEY";
```

### File 3: `public/supabase-config.js`
```
export const SUPABASE_URL     = "REPLACE_WITH_YOUR_PROJECT_URL";
export const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_ANON_KEY";
```

---

## PART 4 — NETLIFY SETUP (~15 min)

### Step 4.1 — Install Git (if you don't have it)
- Mac: open Terminal, run `git --version` (it will prompt you to install if needed)
- Windows: download from https://git-scm.com/download/win

### Step 4.2 — Push Code to GitHub
1. Go to https://github.com → sign in (or create a free account)
2. Click **+** → **New repository**
3. Name: `duramax-portal`, set to **Private**, click **Create repository**
4. GitHub shows you commands. Open Terminal (Mac) or Command Prompt (Windows):

```bash
cd /path/to/duramax-portal        # navigate to this project folder
git init
git add .
git commit -m "Initial setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/duramax-portal.git
git push -u origin main
```

### Step 4.3 — Deploy to Netlify
1. Go to https://app.netlify.com → sign in (free account)
2. Click **Add new site → Import an existing project**
3. Click **GitHub** → authorize Netlify
4. Select your `duramax-portal` repository
5. Build settings are auto-filled from `netlify.toml`
6. Click **Deploy site**
7. Wait ~1 minute — you'll get a URL like `https://duramax-portal.netlify.app`

### Step 4.4 — Set Environment Variables
This is where you tell Netlify your secret keys:
1. In Netlify dashboard → **Site configuration → Environment variables**
2. Click **Add a variable** for each row below:

| Variable Name | Value |
|---------------|-------|
| `SUPABASE_URL` | Your Project URL from Step 1.3 |
| `SUPABASE_SERVICE_KEY` | Your **service_role** key from Step 1.3 (NOT the anon key) |
| `SENDGRID_API_KEY` | Your SendGrid API key from Step 2.3 |
| `ADMIN_EMAIL` | `info@duramaxpavingllc.com` |
| `ADMIN_SECRET` | The same secret you used in admin/index.html above |
| `CLIENT_PORTAL_URL` | `https://YOUR-NETLIFY-URL.netlify.app/client` |

3. After adding all variables: **Deploys → Trigger deploy → Deploy site**

### Step 4.5 — Install Dependencies
In Terminal from your project folder:
```bash
npm install
git add package-lock.json
git commit -m "Add lockfile"
git push
```
Netlify auto-deploys on every push.

---

## PART 5 — CUSTOM DOMAIN (Optional, ~15 min)

### Step 5.1 — Add Domain in Netlify
1. **Site configuration → Domain management → Add domain**
2. Type: `files.duramaxpavingllc.com`
3. Netlify shows you a CNAME record to add

### Step 5.2 — Add DNS at Your Registrar
1. Log into wherever you bought `duramaxpavingllc.com` (GoDaddy, Namecheap, etc.)
2. Find **DNS Management**
3. Add record:
   - Type: `CNAME`
   - Name/Host: `files`
   - Value/Points to: `YOUR-NETLIFY-URL.netlify.app`
4. Save — takes 10–30 min to propagate

### Step 5.3 — Update CLIENT_PORTAL_URL
Once your custom domain works, go back to Netlify environment variables and update:
- `CLIENT_PORTAL_URL` → `https://files.duramaxpavingllc.com/client`

Then redeploy.

---

## PART 6 — TESTING (do this before going live)

### Test 1 — Admin Login
1. Go to `/admin` on your Netlify URL
2. Log in with `info@duramaxpavingllc.com` and the password from Step 1.4
3. You should see the dashboard

### Test 2 — Create a Test Client
1. Click **+ New Client**
2. Use your own email address as the contact email (to receive the test)
3. Enter any company name and project name
4. Click **Create & Send Credentials**
5. Within 1–2 minutes, check your email for the welcome message
6. Confirm: branded email arrives with login credentials

### Test 3 — Client Login Flow
1. Open the link from the welcome email
2. Log in with the temporary credentials
3. You'll be prompted to set a new password → do that
4. You should see the client portal with your company name
5. Upload a test photo
6. Return to admin portal → open that client's folder → confirm the file appears

### Test 4 — Folder Isolation
1. Create a second test client with a different email
2. Log into client portal as that second client
3. Confirm you cannot see files from the first client — only your own folder

---

## DAY-TO-DAY USAGE

### Creating a New Client (30 seconds)
1. Log into `/admin`
2. Click **+ New Client**
3. Enter company name, email, project name
4. Click **Create & Send Credentials**
→ That's it. Supabase creates their account, isolates their folder, SendGrid emails them.

### Sending the Upload Link Again
- Client card → **Resend Login** → resets their password and re-emails credentials
- Or open their folder → **Email Client** → sends just the portal link

### Viewing Files
- Open any client's folder from the admin portal
- Click ⬇ next to any file to download

### Deleting a File
- Open client folder → click 🗑 next to the file

---

## FILE STRUCTURE

```
duramax-portal/
├── SETUP_GUIDE.md                   ← This file
├── netlify.toml                     ← Netlify routing config
├── package.json                     ← Node dependencies
├── .gitignore
├── supabase/
│   └── schema.sql                   ← Run this in Supabase SQL editor
├── functions/
│   ├── create-client.js             ← Creates account + emails credentials
│   ├── resend-credentials.js        ← Resets password + re-emails
│   └── deactivate-client.js         ← Disables client access
└── public/
    ├── supabase-config.js           ← Shared config (fill in your values)
    ├── admin/
    │   └── index.html               ← Admin portal (your interface)
    └── client/
        └── index.html               ← Client portal (what clients see)
```

---

## TROUBLESHOOTING

**"Access denied" on admin login**
→ Check Step 1.5 — make sure the `profiles` row has `role = admin`

**Credential email never arrives**
→ Check SendGrid dashboard → Activity for send status
→ Verify sender identity was confirmed (Step 2.2)

**"Invalid API key" error from Netlify functions**
→ Double-check `SUPABASE_SERVICE_KEY` — it must be the service_role key, not the anon key

**Files not uploading (403 error)**
→ Check Storage policies were created (Step 1.6)
→ Make sure the bucket is named exactly `client-files`

**Client can see other clients' files**
→ Re-run the SQL from schema.sql — the RLS policies may not have applied

**Netlify function errors**
→ Netlify dashboard → Functions → click a function → View logs

---

## READY TO GO LIVE CHECKLIST

- [ ] SQL schema run successfully in Supabase
- [ ] Admin user created and role set to `admin`
- [ ] Storage bucket `client-files` created with policies
- [ ] SendGrid sender email verified
- [ ] All REPLACE_WITH values filled in the HTML files
- [ ] All Netlify environment variables set
- [ ] Test client created and credential email received
- [ ] Client login + file upload tested successfully
- [ ] Custom domain configured (optional)
