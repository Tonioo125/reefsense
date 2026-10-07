# Deploying ReefSense on Google Cloud Run (free trial)

The same Docker image as the Fly.io guide ([DEPLOY.md](DEPLOY.md)) runs as a Cloud Run service. With the Google Cloud free trial ($300 credit for 90 days, [no charges during the trial](https://docs.cloud.google.com/free/docs/free-cloud-features)), it costs you nothing. It also gets more resilience than a single server: Cloud Run moves the app to another zone if one fails, restarts it if it freezes, and adds instances if many people visit at once.

Plan for about 45 minutes the first time. Steps 1–4 are one-time setup.

**Run everything from the folder that holds your git-ignored files** (the model, `gcbd.csv` and the reef-area tiles). `gcloud run deploy --source .` uploads that folder, filtered by `.gcloudignore`, to Google's build service. Keep `.gcloudignore`: without it gcloud also skips everything in `.gitignore`, and the build fails with "Missing files". If you run the pipeline in WSL, install and run gcloud in WSL too.

## 1. Start the free trial (5 min)

1. Go to <https://cloud.google.com/free> and click **Get started for free**. Sign in with a Google account.
2. Enter a payment method. Google uses it only to verify you: it isn't charged during the trial, and nothing is charged afterwards unless you upgrade to a paid account yourself.
3. You're eligible only if you have never been a paying user of Google Cloud, Google Maps Platform or Firebase.

## 2. Install the gcloud CLI (5 min)

Follow the [official installer](https://docs.cloud.google.com/sdk/docs/install-sdk) for your system. In short:

- **Windows:** download and run [GoogleCloudSDKInstaller.exe](https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe), then open a new terminal.
- **macOS:** download the `.tar.gz` for your chip from the installer page, extract it in your home folder, run `./google-cloud-sdk/install.sh`, and open a new terminal.
- **Linux / WSL:**
  ```bash
  curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
  tar -xf google-cloud-cli-linux-x86_64.tar.gz && ./google-cloud-sdk/install.sh
  # answer Y to add gcloud to your PATH, then open a new terminal
  ```

Check it worked: `gcloud --version`.

## 3. Log in and create a project (5 min)

```bash
gcloud auth login                      # opens the browser; on WSL/SSH add --no-launch-browser
gcloud projects create reefcast-<yourname> --name="ReefSense"   # ID: 6-30 chars, lowercase, digits, hyphens; must be unique worldwide
gcloud config set project reefcast-<yourname>
gcloud config set run/region us-central1
```

Link the project to your free-trial billing account. Cloud Run won't start without it, but it is still paid from the credit.
```bash
gcloud billing accounts list           # copy the ACCOUNT_ID, e.g. 01ABCD-234EFG-56HIJK
gcloud billing projects link reefcast-<yourname> --billing-account=<ACCOUNT_ID>
```

On region: `us-central1` (Iowa) is the cheapest pricing tier and close to most judges. `asia-southeast2` (Jakarta) is closer to Indonesian users, costs a little more and is still covered by the credit. Pick one and use it everywhere.

## 4. Turn on the services and the build permission (5 min)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Let the build service deploy to Cloud Run (Google's documented role for source deploys)
PROJECT_NUMBER=$(gcloud projects describe reefcast-<yourname> --format='value(projectNumber)')
gcloud projects add-iam-policy-binding reefcast-<yourname> \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.builder"
```
On **Windows PowerShell**, set the variable this way and put the `add-iam-policy-binding` command on one line:
```powershell
$PROJECT_NUMBER = gcloud projects describe reefcast-<yourname> --format='value(projectNumber)'
gcloud projects add-iam-policy-binding reefcast-<yourname> --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/run.builder"
```
The role takes a couple of minutes to take effect. Do step 5 meanwhile.

## 5. Prepare the files (10 min)

Get this branch onto your machine:
```bash
git fetch origin && git checkout deploy/fly-io     # or main, once the PR is merged
```

Pin the model's package versions, so the server loads the model exactly as your machine does. Print your versions:
```bash
pip freeze | grep -iE '^(lightgbm|scikit-learn|pandas|numpy|joblib)=='
```
Then replace the matching `>=` lines in `backend/requirements-deploy.txt` with those `==` lines.

Run the same check the build runs:
```bash
cd reefresilience && npm ci && npm run build && cd ..
python backend/check_deploy.py          # expect: OK: 3,780 scored reefs; model region 'global'; ...
```

Confirm gcloud will upload the git-ignored files:
```bash
gcloud meta list-files-for-upload | grep -E "bleaching_model.joblib|data/raw/gcbd.csv|reef_area_tiles" | head -3
```
You should see the model, `gcbd.csv` and (if you have them) tile files. If the model or `gcbd.csv` is missing, you're in the wrong folder or `.gcloudignore` is missing.

## 6. Deploy (10 min)

**Linux / macOS / WSL:**
```bash
gcloud run deploy reefcast --source . --allow-unauthenticated \
  --cpu 1 --memory 1Gi --min-instances 1 --max-instances 3 --concurrency 40 --no-cpu-throttling \
  --set-env-vars REEFCAST_WARM_NEWS=Indonesia \
  --liveness-probe httpGet.path=/api/health,periodSeconds=30,timeoutSeconds=5,failureThreshold=3
```

**Windows PowerShell** (the same command on one line):
```powershell
gcloud run deploy reefcast --source . --allow-unauthenticated --cpu 1 --memory 1Gi --min-instances 1 --max-instances 3 --concurrency 40 --no-cpu-throttling --set-env-vars REEFCAST_WARM_NEWS=Indonesia --liveness-probe httpGet.path=/api/health,periodSeconds=30,timeoutSeconds=5,failureThreshold=3
```

The first time, gcloud asks to create an Artifact Registry repository called `cloud-run-source-deploy`. Answer **Y**. Then it uploads your folder, builds the Dockerfile and starts the service. When it finishes, it prints **`Service URL: https://reefcast-….run.app`**: that's your live link.

| Flag | Why |
|---|---|
| `--allow-unauthenticated` | Anyone with the link can open it (otherwise judges get a 403) |
| `--min-instances 1` | One instance is always running, so judges never wait for a cold start and model load |
| `--no-cpu-throttling` | The CPU stays on between requests, so the startup cache warm-up and the 5-hourly news refresh can run |
| `--max-instances 3` | Extra instances if many judges visit at once; the cap keeps credit use predictable |
| `--cpu 1 --memory 1Gi` | Measured peak was about 260 MB, so 1 GiB leaves plenty of headroom |
| `--liveness-probe …/api/health` | Cloud Run restarts the container if it stops answering for 90 s |
| `REEFCAST_WARM_NEWS=Indonesia` | The case-study reefs' news is ready before anyone opens it |

## 7. Verify (10 min)

```bash
URL=$(gcloud run services describe reefcast --format='value(status.url)')
curl "$URL/api/health"                              # {"status":"ok","data_ready":true,...}
gcloud run services logs read reefcast --limit 50   # look for "Cache warm-up failed" or tracebacks
```
(PowerShell: `$URL = gcloud run services describe reefcast --format='value(status.url)'`, then `curl.exe "$URL/api/health"`.)
In a private browser window, **and on a phone**:
- [ ] The map loads with reefs and the NOAA-gap banner.
- [ ] Opening **Crystal Bay (Nusa Penida)** shows the explanation, heat chart, survey history and news. News should appear instantly.
- [ ] The heat-scenario slider changes the prediction.
- [ ] The bleaching history replay plays.
- [ ] The reef-area layer draws, if you shipped tiles.

Then:
- Put the URL at the top of `README.md` and in the Devpost description.
- Add a free [UptimeRobot](https://uptimerobot.com) monitor on `<URL>/api/health` (every 5 minutes, email alerts).

## 8. During judging

- **Redeploy:** run `gcloud run deploy reefcast --source .`. Settings from step 6 carry over. The new version takes traffic only after it starts, so there is no downtime.
- **Roll back:** list versions with `gcloud run revisions list --service reefcast`, then send all traffic to the earlier one with `gcloud run services update-traffic reefcast --to-revisions <REVISION>=100`.
- **Credit left:** Google Cloud console → **Billing** → **Overview**.

## 9. After judging

```bash
gcloud run services update reefcast --min-instances 0   # keep the link, stop using credit while idle (first visit then waits for a cold start)
gcloud run services delete reefcast                     # or remove the service
```
When the trial ends (90 days or the $300 is used), Google stops the project rather than billing you, unless you have upgraded to a paid account.

## Cost (paid from the $300 credit)

One always-on instance (1 vCPU, 1 GiB, `us-central1`, CPU always on) costs about **$7 a week, or $45–50 a month**. That's at [Cloud Run's listed rates](https://cloud.google.com/run/pricing) after the free monthly allowance. The image build and storage add a few cents. Extra instances (up to 3) cost the same per hour, and only while they run.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `Missing files the deployed site needs` | You deployed from a folder without the model or `gcbd.csv`, or `.gcloudignore` is missing. Check with `gcloud meta list-files-for-upload` (step 5). |
| `PERMISSION_DENIED`, or the build can't deploy | Run the `roles/run.builder` command (step 4), wait 2 minutes, then deploy again. |
| `Billing account … not found`, or billing must be enabled | Link the trial billing account (step 3). |
| The URL returns **403 Forbidden** | `gcloud run services add-iam-policy-binding reefcast --member=allUsers --role=roles/run.invoker` |
| `Memory limit … exceeded` in the logs | `gcloud run services update reefcast --memory 2Gi` |
| `WARNING: … version …` in the build log | Pin the versions (step 5) and deploy again. |
| You need the full build log | `gcloud builds list --limit 3`, then open the log URL it shows. |
