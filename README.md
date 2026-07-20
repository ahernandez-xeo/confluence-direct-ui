# Conference Direct — UI

React (CRA) portal for Tableau embeds.

**v1 scope:** login + embedded dashboards (password reset / logos / Mailgun deferred).

## Local run

```bash
npm install
npm start
```

App runs on port `3106`. Set `BACKEND_BASE_URL` in `src/constants.js` to your backend (`http://127.0.0.1:8080` for local).

## Deploy (App Engine Standard)

```bash
npm run build
gcloud app deploy app.yaml --project=cdanalytics-501818
```

## Branding

Placeholder wordmark SVGs live in `src/assets/cd-logo.svg` / `cd-logo-light.svg`. Palette comes from the Conference Direct portal mockup (navy `#0B2C4A`, orange `#E8572A`).
