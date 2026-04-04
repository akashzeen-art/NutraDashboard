# Deploy Nutra Dashboard (Vite + React)

**Live dashboard:** [https://nutradashboard.v1mobi.com/](https://nutradashboard.v1mobi.com/)

**Report API (data source):** `https://pu.playtonight.fun/api/payment/report/bucket-wise?date=YYYY-MM-DD`

The API may return a **plain array** of rows, or an **object envelope** with optional metric row titles:

```json
{
  "data": [ /* ProductReport rows */ ],
  "metricLabels": {
    "entry": "Entry (Mobile No)",
    "clicks": "Clicks",
    "initiated": "Payment Initiated",
    "failed": "Payment Failed",
    "success": "Success"
  }
}
```

(`metric_labels` is also accepted.) If omitted, the dashboard uses the same default labels. The **entry row values** always come from `user.msisdnList` in each API row.

Each row includes `productId`, `productName`, `date`, `dsp`, `domain`, `price`, `hours[]` (`hourTime`, `clicks`, `initiatedCount`, `successCount`, `failureCount`), and `user.msisdnList` (strings or `{ phone, firstName, status, dsp, productInfo, ... }`).

## Netlify

1. Connect this repo and use **Build command:** `npm run build`, **Publish directory:** `dist`.
2. `netlify.toml` already:
   - Proxies `/api/*` → `https://pu.playtonight.fun/api/*` (avoids CORS from the dashboard domain to PlayTonight).
   - Sets `VITE_API_REPORT_ENDPOINT=/api/payment/report/bucket-wise` and leaves **`VITE_API_BASE_URL` unset** so the browser calls your dashboard origin + `/api/...`, which Netlify forwards to PlayTonight.
3. In **Site settings → Environment variables**, add at minimum:
   - `VITE_API_REPORT_ENDPOINT` = `/api/payment/report/bucket-wise` (if not relying on `netlify.toml` `[build.environment]` only)
   - **Login:** set `VITE_AUTH_LOGIN_URL` to your real auth API (POST JSON `{ "email", "password" }`). For production, **do not** set `VITE_FALLBACK_LOGIN_EMAIL` / `VITE_FALLBACK_LOGIN_PASSWORD` (those are for local `.env` only; see `.env.example`).

## Local development

```bash
cp .env.example .env
# `.env.example` includes demo fallback login (`admin@gmail.com` / `Admin@123`). Use `VITE_AUTH_LOGIN_URL` for real auth; do not deploy fallback credentials to Netlify.
npm install
npm run dev
```

With `VITE_API_BASE_URL` omitted, `npm run dev` uses `http://localhost:5173` and **Vite proxies** `/api` to `pu.playtonight.fun` (see `vite.config.ts`).

## Direct API mode (no proxy)

If PlayTonight sends CORS headers for your dashboard origin, you can set:

`VITE_API_BASE_URL=https://pu.playtonight.fun`  
`VITE_API_REPORT_ENDPOINT=/api/payment/report/bucket-wise`

Then remove or avoid relying on the `/api` proxy.

## Troubleshooting `API error: 404`

1. **404 on your dashboard URL** (e.g. `https://nutradashboard.v1mobi.com/api/payment/report/bucket-wise?...`): the host is not forwarding `/api` to PlayTonight. This project uses `netlify.toml` **and** `public/_redirects` (copied into `dist`) so `/api/*` proxies to `https://pu.playtonight.fun`. Redeploy after pulling the latest repo. If you use **non-Netlify** hosting, configure the same proxy there or set **`VITE_API_BASE_URL=https://pu.playtonight.fun`** in the build environment (PlayTonight must send CORS headers for your dashboard origin).

2. **404 on pu.playtonight.fun** in the error message: the report path or `date` query may be wrong, or the backend returned no data for that day — confirm the API in a browser or curl.
