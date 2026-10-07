# Deploying ReefSense

One Docker image serves the web app and the API from one URL, on one always-on [Fly.io](https://fly.io) Machine. It costs about **$2 for a week** ([Fly.io pricing](https://docs.fly.io/about/pricing)). Plan for 30–45 minutes the first time.

```
browser ── https://<app>.fly.dev ──> uvicorn (FastAPI, 1 worker)
                                      ├── /            ReefSense web app (reefresilience/dist)
                                      ├── /api/*       scores, explanations, /api/predict (LightGBM)
                                      └── /api/tiles/* reef-area images (UNEP-WCMC, never as vectors)
```

**Deploy from your own computer, from the repository folder that holds the git-ignored files.** The model, the GCBD survey table and the reef-area tiles are not in git. `fly deploy` uploads your local folder (filtered by `.dockerignore`, not `.gitignore`), so these files reach the image without being committed. A fresh clone does not have them.

## 1. One-time setup (10 min)

1. Create a Fly.io account and **add a credit card**. The free trial ends after 2 hours of Machine runtime, which an always-on demo uses up almost immediately.
2. Install `flyctl` and log in:
   ```bash
   brew install flyctl                       # macOS
   curl -L https://fly.io/install.sh | sh    # Linux / WSL
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"   # Windows PowerShell
   fly auth login
   ```
3. Get this branch into your local repository:
   ```bash
   git fetch origin && git checkout deploy/fly-io     # or main, once the PR is merged
   ```

## 2. Check the files the site needs (5 min)

| File | Required | Made by |
|---|---|---|
| `data/processed/sites_scored.json` | yes | `pipeline/04_score_sites.py` (committed) |
| `data/processed/bleaching_model.joblib` | yes | `pipeline/03_train_bleaching.py --region global` (git-ignored) |
| `data/raw/gcbd.csv` | yes | `pipeline/01b_import_gcbd_sqlite.py` (git-ignored) |
| `data/processed/crw_heat_grid_series.json` | for the heat chart | `pipeline/02b_fetch_crw_grid.py` (committed) |
| `data/processed/model_validation.json` | for the stress tests panel | `pipeline/06_validate_model.py` (committed) |
| `data/processed/reef_area_tiles/` | for the reef-area layer | `pipeline/05_reef_area_tiles.py` (git-ignored, license) |

**Optional, but recommended the day before you record:** refresh the heat data so the site shows a recent "as of" date. This takes about 25 minutes. Commit the updated JSON files.
```bash
python pipeline/02_fetch_crw.py --days 180 && python pipeline/02b_fetch_crw_grid.py && python pipeline/04_score_sites.py
```

**Pin the model's package versions.** The model was saved with the scikit-learn, LightGBM and pandas versions installed on your machine. Without pins, the image installs the newest ones. Print yours:
```bash
pip freeze | grep -iE '^(lightgbm|scikit-learn|pandas|numpy|joblib)=='
```
Then replace the matching `>=` lines in `backend/requirements-deploy.txt` with those `==` lines.

Then run the pre-deploy check. The Docker build runs the same check, so this is what the build will do:
```bash
cd reefresilience && npm ci && npm run build && cd ..      # the check needs the built web app
python backend/check_deploy.py
```
Expected output: `OK: 3,780 scored reefs; model region 'global'; Nusa Penida at 2 DHW -> resilience …`. A `Note:` about a missing optional file is fine. A `WARNING:` about versions means the pins above don't match.

## 3. Create the app (2 min)

```bash
fly apps create reefcast
```
App names are global. If `reefcast` is taken, pick another, for example `reefcast-<team>`, and put the same name in `app = "..."` at the top of `fly.toml`. Your URL will be `https://<name>.fly.dev`.

The region is `iad` (US East: cheapest, and close to most judges). For Indonesian users, set `primary_region = "sin"` in `fly.toml` (about $0.40 more per week).

## 4. Deploy (5–10 min)

```bash
fly deploy --ha=false
```
- `--ha=false` creates **one** Machine. Without it, Fly creates two and the cost doubles. See the alternatives section below if you want the spare.
- The build runs on Fly's builders, so you don't need Docker installed. Near the end of the log you should see the `OK: …` line from `check_deploy.py`. If anything required is missing, the build stops there and the live site is left as it was.
- Do not add a dedicated IPv4 address ($2/month), a volume or Postgres. The app needs none of them; the shared IPv4 address is free.

## 5. Verify (10 min)

```bash
fly status                                  # 1 machine, state "started", checks passing
curl https://<name>.fly.dev/api/health      # {"status":"ok","data_ready":true,...}
fly logs                                    # look for "Cache warm-up failed" or tracebacks
```
In a private browser window, **and on a phone**:
- [ ] The map loads with reefs and the NOAA-gap banner.
- [ ] Opening **Crystal Bay (Nusa Penida)** shows the explanation, heat chart, survey history and news. News should appear instantly, because it is pre-fetched for Indonesia's case-study reefs.
- [ ] The heat-scenario slider changes the prediction.
- [ ] The bleaching history replay plays.
- [ ] The reef-area layer draws, if you shipped tiles.

Check memory on the app's **Metrics** tab in the Fly dashboard. In testing with a smaller survey table, it used about 250 MB after startup and 260 MB at peak, against the 1 GB Machine.

## 6. During judging

- **Get an alert if it goes down.** Add a free [UptimeRobot](https://uptimerobot.com) HTTP monitor on `https://<name>.fly.dev/api/health` every 5 minutes, with email alerts.
- **Don't deploy after you submit.** If you have to:
  - deploy again with `fly deploy --ha=false`;
  - to roll back, find an earlier image with `fly releases --image` and deploy it with `fly deploy --image <image>`.
- **If the site stops responding:** run `fly apps restart <name>`, then check `fly logs`.
- Put the link at the top of `README.md` and in the Devpost description.

## 7. After judging: stop paying

```bash
fly scale count 0          # pause: keeps the app and URL, no Machine running (a few cents a month at most)
fly apps destroy <name>    # or delete everything
```

## Cost

| Item | Per 30 days, always on | One week |
|---|---|---|
| shared-cpu-1x, 1 GB, `iad` | $6.70 | ≈ $1.56 |
| Outbound data ($0.02/GB in North America) | a few cents | ≈ $0.05 |
| `*.fly.dev` URL, TLS certificate, shared IPv4 | free | free |

Fly.io has no billing alerts ([cost management docs](https://docs.fly.io/about/cost-management)). Check "current month to date" in the dashboard.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build stops at `Missing files the deployed site needs` | Generate the listed file (table in step 2), or deploy from the folder that has it. |
| `WARNING: … version …` in the build log | Pin the versions (step 2) and deploy again. |
| `Out of memory` in `fly logs`, or the Machine keeps restarting | `fly scale memory 2048`. That is +$6/month on the same CPU, so about $3 for the week. |
| The upload takes a long time | Something large is in the build context. `node_modules`, `.venv` and `data/raw` (except `gcbd.csv`) are already excluded in `.dockerignore`. |
| The news panel says "unavailable" | Mongabay was slow or down. The site retries after 5 minutes; the rest of the page is unaffected. |
| The reef-area layer is blank | No `data/processed/reef_area_tiles/` in the folder you deployed from. Run `pipeline/05_reef_area_tiles.py`, then deploy again. |

## What the image does, and alternatives

Choices already built into the image:
- **Same origin for app and API.** There is no CORS configuration or proxy to set up, and no proxy timeout to cut off the slow news requests.
- **Caches built at startup.** The model, the reef list and the bleaching-history replay are loaded or computed when the server starts, so the first visitor doesn't wait. News for the case-study reefs (`REEFCAST_WARM_NEWS`) is fetched at startup and refreshed every 5 hours.
- **Build-time check.** `check_deploy.py` loads the model and scores a reef during the build, so a broken image never goes live.
- **Caching and compression.** Hashed assets are cached for a year and `index.html` is never cached, so a redeploy shows up immediately. API JSON is gzipped; the reef list goes from 8.9 MB to 145 KB.
- **Safety and stability.** The server runs as a non-root user, with a single worker (each extra worker would load another copy of the model), 512 MB of swap and a health check on `/api/health`.
- **Portable image.** The container listens on `$PORT`, so the same image runs unchanged on Render, Railway or Google Cloud Run.

| Alternative | Better when | Trade-off |
|---|---|---|
| **2 Fly Machines** (`fly scale count 2`) | You want the site to survive a host failure during judging | +$1.56/week. Each Machine keeps its own caches, which is fine. |
| **Render** (Docker web service, Standard 2 GB) | You prefer a dashboard to a CLI | About $25/month, prorated, so roughly $6 for a week. Its builds come from GitHub, so the git-ignored model and CSV would have to come from private storage. The free tier sleeps after 15 minutes and takes about a minute to wake. |
| **Railway** | You want GitHub-push deploys | Same issue as Render: the build can't see git-ignored files unless you upload from your machine or use storage. |
| **Google Cloud Run** | You have cloud credits, or want to pay nothing while idle | Scaling to zero means a cold start and a model load for the first visitor. `--min-instances=1` avoids that but costs more than Fly. |
| **Hugging Face Spaces** | You want visibility with an ML audience | Docker Spaces need a PRO plan, and files in a public Space can be downloaded, which conflicts with the UNEP-WCMC tile license. |
| **Static app on Cloudflare Pages or Vercel, API on Fly** | Traffic grows well beyond a demo | Two deploys, plus `VITE_API_BASE_URL` and `REEFCAST_CORS` to configure. |
| **Automatic weekly refresh** (GitHub Actions running `02b` and `04`, then `fly deploy`) | You keep running it after the hackathon | The model, CSV and tiles would need to live in private storage (S3 or R2) that the workflow can download from. |
