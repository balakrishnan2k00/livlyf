# Livlyf

**Live your career story** — glossy, compact dashboard for profiles, job descriptions, and pay-per-use Azure OpenAI runs with role-aware prompts.

| Piece | Stack |
|--------|--------|
| Auth & data | **Supabase** (new project + migration) |
| API | Node/Express on **Render** (`livlyf-api`) |
| Web | Vite/React static site on **Render** (`livlyf-web`) |
| AI | **Azure OpenAI** (e.g. `gpt-6-luna` — set when you share details) |
| Billing | **Stripe** per run; admins free via `LIVLYF_ADMIN_EMAILS` |

## Start here (what to do, login, database)

Your Supabase project is **LivLyf** (`hzaakdbgkuawheuvkdhh`). The **database migration is already applied** (tables: `profiles`, `role_definitions`, `prompt_templates`, etc.). You do **not** need to run SQL again unless you delete the project or reset the database.

### Step 1 — Create `livlyf/.env`

In folder `e:\Projects\livlyf`, copy the example file:

```powershell
cd e:\Projects\livlyf
copy .env.example .env
```

Open **`.env`** and fill **only these four** for local login + dashboard (Stripe/Azure can wait):

| Variable | Where to get it in Supabase |
|----------|-----------------------------|
| `SUPABASE_URL` | **Project Settings → API → Project URL** (already in `.env.example`) |
| `VITE_SUPABASE_URL` | Same URL as above |
| `VITE_SUPABASE_ANON_KEY` | **Project Settings → API → `anon` `public`** (or **Publishable** key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings → API → `service_role` `secret`** (long `eyJ…` string) |

**Not the same thing:** the **database password** / `postgresql://…` URL is for SQL tools only. The API needs the **`service_role` JWT** from the **API** page.

Optional: set `LIVLYF_ADMIN_EMAILS=you@example.com` so AI runs are free for your account.

### Step 2 — Allow login from your PC (Supabase Auth)

In [Supabase Dashboard](https://supabase.com/dashboard/project/hzaakdbgkuawheuvkdhh) → **Authentication → URL configuration**:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** add `http://localhost:5173/**`

**Authentication → Providers → Email:** leave **Email** enabled. For easiest testing, turn **off** “Confirm email” (otherwise you must click the link in your inbox before sign-in works).

### Step 3 — Run the app

```powershell
cd e:\Projects\livlyf
npm install
npm run dev
```

You should see **web** on `http://localhost:5173` and **API** `Livlyf API listening on 0.0.0.0:3001`.

### Step 4 — How to log in

1. Open **http://localhost:5173** (or the port Vite prints).
2. You land on **Login**.
3. Click **“Need an account? Sign up”**.
4. Enter **email + password** (min 6 characters) → **Create account**.
5. If email confirmation is **on**, confirm via the email from Supabase, then **Sign in**.
6. After sign-in you see the **Dashboard** (role cards). Supabase auto-creates your row in **`profiles`** on first signup.

There is **no separate admin login** — same page. Admins are users whose email is in `LIVLYF_ADMIN_EMAILS`.

### Migration (only if you reset the database)

**Already done** for LivLyf. To verify: Dashboard → **Table Editor** → you should see `role_definitions` (8 rows).

To run again manually (e.g. new empty project):

1. Dashboard → **SQL Editor** → New query.
2. Paste all of `supabase/migrations/20251016100000_init.sql` → **Run**.

Or with CLI (optional): `supabase link` + `supabase db push` — not required if tables already exist.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Red “Supabase env missing” on login | Fix `VITE_*` in `livlyf/.env`, restart `npm run dev` |
| API won’t start | Set `SUPABASE_SERVICE_ROLE_KEY` (JWT, not DB password) |
| Sign up works but sign in fails | Confirm email or disable confirm in Auth settings |
| Dashboard empty / errors on History | API must be running; check terminal for port 3001 |
| Render build **exit 127** on `vite build` | Build must install dev deps: `npm install --include=dev && npm run build`. Do **not** set `NODE_ENV=production` during build (Render sets it at runtime). |

## Push to Git (GitHub)

`livlyf` is its own app — use a **separate repo** (not the whole `e:\Projects` folder).

### One-time setup

```powershell
cd e:\Projects\livlyf
git init
git add .
git commit -m "Initial Livlyf app (web, API, Supabase schema)"
```

Create an empty repo on GitHub (website: **New repository** → name e.g. `livlyf` → no README). Then:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/livlyf.git
git push -u origin main
```

Or with GitHub CLI (`gh auth login` first):

```powershell
gh repo create livlyf --private --source=. --remote=origin --push
```

`.env` is in `.gitignore` — **never commit** Supabase or Stripe secrets.

---

## Deploy on Render (from Git)

Render deploys from **GitHub/GitLab/Bitbucket**. Supabase stays as-is (hosted by Supabase).

### 1. Connect GitHub to Render

1. [dashboard.render.com](https://dashboard.render.com) → sign in.
2. **Account Settings** → connect **GitHub** and allow access to the `livlyf` repo.

### 2. Create service from Blueprint

1. **New +** → **Blueprint** (or edit existing **`livlyf`** service).
2. Select the **`livlyf`** repository.
3. **`render.yaml`** deploys **one** service: React UI + `/api` on the same URL (e.g. `https://livlyf.onrender.com`).

Click **Apply** / redeploy after pulling the latest code.

### 3. Set environment variables (Dashboard)

After Blueprint creates the services, open each service → **Environment** and set:

**Service `livlyf`** (all on one service)

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | `https://hzaakdbgkuawheuvkdhh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT from Supabase |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` (used at **build** time) |
| `VITE_SUPABASE_ANON_KEY` | anon key from Supabase |
| `CORS_ORIGIN` | `https://livlyf.onrender.com` |
| `CLIENT_ORIGIN` | `https://livlyf.onrender.com` |
| `VITE_API_URL` | leave **empty** (same-origin `/api`) |
| `LIVLYF_ADMIN_EMAILS` | your@email.com |
| `AZURE_OPENAI_*` / `STRIPE_*` | when ready |

After changing any `VITE_*` variable: **Manual Deploy** → **Clear build cache & deploy**.

### 4. Supabase Auth for production

Supabase → **Authentication → URL configuration**:

- **Site URL:** `https://livlyf.onrender.com`
- **Redirect URLs:** add `https://livlyf.onrender.com/**`

Keep `http://localhost:5173/**` if you still develop locally.

### 5. After deploy

- Open the **web** URL → sign up / sign in (same as local).
- API health: `https://livlyf.onrender.com/health` → `{"ok":true,...}`

### Updates later

```powershell
cd e:\Projects\livlyf
git add .
git commit -m "Describe your change"
git push
```

Render **auto-deploys** on push to `main` (default).

## Admin (free usage)

Set `LIVLYF_ADMIN_EMAILS` to your login email(s). Optionally set `profiles.is_admin = true` in Supabase for the same users.

## Branding

- Icon: `apps/web/public/livlyf-icon.svg`
- Logo: `apps/web/public/livlyf-logo.svg`

## What you’ll provide next

- Azure GPT deployment details (`AZURE_OPENAI_*`)
- Sample JD and profile content (optional seed)
- Stripe keys and webhook URL → `https://<api>/webhooks/stripe`
