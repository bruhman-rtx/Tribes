# Deploying Tribes → tribes.aphelion.world (Railway)

This is the **static prototype** (Ink & Citrus theme, mock data — no backend yet). It serves as
plain static files; `serve` hosts the `app/` folder on Railway's `$PORT`.

- `/`            → mobile app (`app/index.html`); on the live domain, desktop browsers auto-redirect to the desktop build (`?m=1` forces mobile)
- `/desktop.html`→ desktop app
- routing is client-side (hash + JS), so no server rewrites are needed

## 1. Deploy to Railway
```
railway login                 # interactive — run yourself (or `! railway login` in the session)
railway init                  # create/link a project, in this repo dir
railway up                    # builds with Nixpacks (npm install + npm start) and deploys
```
Railway runs `npm start` = `serve app -l $PORT`. Confirm the deploy is green and the
generated `*.up.railway.app` URL loads.

## 2. Attach the custom domain
Railway dashboard → your service → **Settings → Networking → Custom Domain** → enter
`tribes.aphelion.world`. Railway then shows the **exact DNS record to add**.

## 3. DNS (the A-record question)
- For a **subdomain**, Railway gives you a **CNAME** target (e.g. `xxxx.up.railway.app`). There is
  **no static A-record IP** to hard-code — Railway's edge IPs rotate, so a hard A record will break.
- **If you need/want an A record:** put `aphelion.world` on **Cloudflare**, then add a **proxied
  CNAME** `tribes` → `<railway-target>` (orange cloud ON). Cloudflare flattens it so the public sees
  an **A record**, while the underlying target stays a CNAME that can't go stale.
- Whichever you use, the value comes from the Railway dashboard in step 2 — paste it into DNS.

## 4. Verify
Wait for DNS propagation, then load `https://tribes.aphelion.world`. HTTPS is auto (Railway / Cloudflare).

---
**Note:** this is a front-end demo. A real product at this domain needs the backend
(accounts/auth, database, persistent tribes/messages, the interest-overlap match engine).
