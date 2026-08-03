# GitHub Setup - Step by Step

## What is GitHub?
GitHub stores your code in the cloud so Vercel can auto-deploy changes.

---

## Step 1: Create a GitHub Account

1. Go to https://github.com/signup
2. Enter email: azjoinery.au@gmail.com
3. Create password (remember it!)
4. Username: Choose something (e.g., "az-joinery-app")
5. Click "Create account"
6. Verify your email

**Time: 2 minutes**

---

## Step 2: Create a New Repository

1. After login, click **+** (top right)
2. Select "New repository"
3. Fill in:
   - Repository name: `az-joinery-pwa`
   - Description: "AZ Joinery PWA - Custom joinery management"
   - Public (anyone can see, but only you can edit)
   - Skip README checkbox (we have docs already)
4. Click "Create repository"

**You'll see a page with instructions. Copy the commands below.**

---

## Step 3: Push Code to GitHub

In your terminal:

```bash
cd /APP/az-joinery-pwa

# Initialize git (if not done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: AZ Joinery PWA Phase 1"

# Rename branch to main
git branch -M main

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git

# Push to GitHub
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username**

**Expected output:**
```
... | 1 file changed, 100 insertions(+)
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**Time: 1 minute**

---

## Step 4: Verify on GitHub

1. Go to https://github.com/YOUR_USERNAME/az-joinery-pwa
2. You should see your files:
   - app/
   - lib/
   - public/
   - package.json
   - README.md
   - etc.

**✅ If you see your files, GitHub is set up!**

---

## Troubleshooting

### "fatal: not a git repository"
```bash
cd /APP/az-joinery-pwa
git init
# Then run the commands again
```

### "fatal: remote origin already exists"
```bash
git remote remove origin
# Then run the git remote add command again
```

### "Permission denied (publickey)"
GitHub uses SSH keys. Use HTTPS instead:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git
```

### "Could not resolve hostname github.com"
No internet connection. Check your network.

---

## Next: Deploy on Vercel

Once GitHub is set up, go to `VERCEL_SETUP.md` for deployment.

---

**GitHub Setup Complete!** ✅
