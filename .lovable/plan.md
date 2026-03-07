

## Self-Hosting on Hostinger

Your Lovable app can be self-hosted. Here's what you need to do:

### 1. Export Your Code
- Connect your project to **GitHub** via Settings → Connectors → GitHub
- This gives you the full source code in a repository

### 2. Build the Frontend
On your local machine or Hostinger:
```bash
git clone <your-repo-url>
cd <project-folder>
npm install
npm run build
```
This creates a `dist/` folder with static HTML/CSS/JS files.

### 3. Deploy on Hostinger
- **If using Hostinger Shared Hosting**: Upload the contents of the `dist/` folder to your `public_html` directory via File Manager or FTP
- **If using Hostinger VPS**: You can run it with Node.js or serve the static files with Nginx

### 4. Domain Setup
- Point your domain's DNS to Hostinger's nameservers (Hostinger provides these in their dashboard)
- Or set A records to your Hostinger server IP

### 5. Backend Consideration
Your app currently uses **Lovable Cloud** for the database (leads, appointments, WhatsApp messages, design tasks, etc.). You have two options:

- **Option A (Recommended)**: Keep using Lovable Cloud as your backend — just update the `.env` file in your build with the existing Supabase URL and anon key. Your Hostinger-hosted frontend will connect to the same backend. No data migration needed.

- **Option B**: Migrate to your own database on Hostinger — this requires setting up PostgreSQL, recreating all tables, migrating data, and re

<lov-plan>

## Self-Hosting on Hostinger

Your Lovable app can be self-hosted. Here's what you need to do:

### 1. Export Your Code
- Connect your project to **GitHub** via Settings → Connectors → GitHub
- This gives you the full source code in a repository

### 2. Build the Frontend
On your local machine or Hostinger:
```bash
git clone <your-repo-url>
cd <project-folder>
npm install
npm run build
```
This creates a `dist/` folder with static HTML/CSS/JS files.

### 3. Deploy on Hostinger
- **If using Hostinger Shared Hosting**: Upload the contents of the `dist/` folder to your `public_html` directory via File Manager or FTP
- **If using Hostinger VPS**: You can run it with Node.js or serve the static files with Nginx

### 4. Domain Setup
- Point your domain's DNS to Hostinger's nameservers (Hostinger provides these in their dashboard)
- Or set A records to your Hostinger server IP

### 5. Backend Consideration
Your app currently uses **Lovable Cloud** for the database (leads, appointments, WhatsApp messages, design tasks, etc.). You have two options:

- **Option A (Recommended)**: Keep using Lovable Cloud as your backend. Just deploy the frontend on Hostinger — it will connect to the same backend automatically. No data migration needed. Your domain serves the UI, Lovable Cloud handles the database and edge functions.

- **Option B (Full migration)**: Set up your own PostgreSQL database on Hostinger VPS, recreate all 10+ tables (leads, design_tasks, appointments, whatsapp_messages, etc.), migrate existing data, and rewrite the edge functions (WhatsApp webhook, etc.) as Node.js APIs. This is a significant effort and not recommended unless you have a specific reason.

### 6. Important: SPA Routing
Since this is a React Single Page App, you need to add a `.htaccess` file in `public_html` for Hostinger shared hosting:
```text
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```
This ensures routes like `/appointments`, `/designs`, `/chat` work correctly.

### Summary
| Step | Action |
|------|--------|
| Code export | GitHub → Clone |
| Build | `npm run build` |
| Upload | `dist/` → `public_html` |
| Domain | DNS to Hostinger |
| Backend | Keep Lovable Cloud (recommended) |
| Routing | Add `.htaccess` for SPA |

