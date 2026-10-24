# Straightforward frontend

## API configuration

The frontend uses a shared API client in `src/services/api.js`. Set
`VITE_API_URL` in the Vercel project to the API base URL, including `/api`,
then redeploy so Vite includes the variable in the production build:

```text
https://straightforward-d98r.onrender.com/api
```

Do not add a route such as `/games` to `VITE_API_URL`; services append routes
such as `/games` themselves. If the variable is missing, requests use `/api`,
which `vercel.json` rewrites to the Render backend.

For local development, run `npm run dev`. Vite proxies `/api` to
`http://localhost:3000`. Run `npm run build` to create the production build.
