# Deploying ReefSense on Azure Container Apps (Azure for Students, no card)

The same Docker image as the other guides runs as an Azure Container App with one replica always on. Azure for Students gives [$100 of credit with no credit card](https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0170p). You must be 18 or older and a full-time student at an accredited degree-granting school, verified with your school email.

**Build the image on your own PC with Docker Desktop.** Azure's cloud build (`az acr build`) is [paused for subscriptions paid with free credits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview), including Azure for Students. Building locally also puts the git-ignored model, `gcbd.csv` and tiles into the image directly.

Commands are written for **Windows Command Prompt**. Run them from your `reefcast` repo folder (the one with `Dockerfile` and `data\processed\bleaching_model.joblib`).

## 1. Sign up and install the tools (15 min)

1. Activate Azure for Students at <https://azure.microsoft.com/free/students> using your school email.
2. Install the Azure CLI and Docker Desktop, then restart your PC:
   ```cmd
   winget install -e --id Microsoft.AzureCLI
   winget install -e --id Docker.DockerDesktop
   ```
3. Start **Docker Desktop** and wait until it shows "Engine running".
4. Log in: `az login` (choose the **Azure for Students** subscription if asked).

## 2. Pick an allowed region (2 min)

Student subscriptions can only deploy to about five regions, and the set differs per person ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5868834/azure-student-subscription-region-and-resource-dep)). Find yours:
- Portal: **Policy → Assignments → "Allowed resource deployment regions" → Parameters**, or
- `az policy assignment list --disable-scope-strict-match --query "[?contains(displayName,'region')].parameters" -o json`

Prefer `centralindia` or `southindia` (closest to the judges), then `southeastasia`. Use it as `REGION` below.

## 3. Set names and create the resources (5 min)

The registry name must be unique worldwide, 5–50 characters, lowercase letters and digits only.
```cmd
set REGION=centralindia
set RG=reefcast-rg
set ACR=reefcastanton01

az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
az group create -n %RG% -l %REGION%
az acr create -n %ACR% -g %RG% -l %REGION% --sku Basic --admin-enabled true
az containerapp env create -n reefcast-env -g %RG% -l %REGION% --logs-destination none
```

## 4. Build and push the image (10 min)

First pin your model's versions in `backend/requirements-deploy.txt` (copy the lines from `pip freeze | findstr /I "lightgbm scikit-learn pandas numpy joblib"`).
```cmd
docker build --platform linux/amd64 -t %ACR%.azurecr.io/reefcast:v1 .
az acr login -n %ACR%
docker push %ACR%.azurecr.io/reefcast:v1
```
The build runs `check_deploy.py`. Look for `OK: 3,780 scored reefs …` near the end. If it stops at "Missing files", you're in the wrong folder.

## 5. Create the app (3 min)

```cmd
az containerapp create -n reefcast -g %RG% --environment reefcast-env --image %ACR%.azurecr.io/reefcast:v1 --registry-server %ACR%.azurecr.io --target-port 8080 --ingress external --cpu 1 --memory 2Gi --min-replicas 1 --max-replicas 3 --env-vars REEFCAST_WARM_NEWS=Indonesia --query properties.configuration.ingress.fqdn -o tsv
```
It prints the address, e.g. `reefcast.<random>.centralindia.azurecontainerapps.io`. Your live link is `https://` plus that. The CLI reads the registry password itself because the registry has admin access enabled.

Check it: open `https://<address>/api/health`, then work through the browser checklist in [DEPLOY.md](DEPLOY.md#5-verify-10-min). See the server log with `az containerapp logs show -n reefcast -g %RG% --tail 50`.

## Redeploy, cost and cleanup

- **Redeploy:** build and push with a new tag (`:v2`), then `az containerapp update -n reefcast -g %RG% --image %ACR%.azurecr.io/reefcast:v2`. The new version takes traffic once it's healthy.
- **Cost (from the $100 credit):** about $5–7 a week. That's one idle-rate replica (1 vCPU, 2 GiB at [$0.000003 per vCPU-second and per GiB-second idle in Central India](https://azure.microsoft.com/en-us/pricing/details/container-apps/)) plus the Basic registry (about $0.17 a day). When the credit runs out, Azure disables the subscription; it doesn't charge you.
- **After judging:** `az group delete -n %RG% --yes --no-wait` removes everything.

| Problem | Fix |
|---|---|
| `RequestDisallowedByAzure` | That region isn't allowed for your subscription (step 2). Delete the group and use an allowed region. |
| `docker` isn't recognized, or the build can't connect | Start Docker Desktop and wait for "Engine running". |
| `unauthorized` on `docker push` | Run `az acr login -n %ACR%` again. |
| The registry name is taken | Choose another value for `ACR`. |
