# ReefCast: one image serving the ReefResilience web app and the FastAPI backend on the same origin.
# Deployment guide: DEPLOY.md. Build from the repository root, in the folder that holds the git-ignored
# model, survey table and tiles (see .dockerignore):  docker build -t reefcast .

# --- 1. Web app ---------------------------------------------------------------------
FROM node:20-slim AS web
WORKDIR /web
COPY reefresilience/package.json reefresilience/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY reefresilience/ ./
# Empty = same-origin /api (the backend below serves the app). Overrides any value in a local .env file.
ENV VITE_API_BASE_URL=""
RUN npm run build

# --- 2. API + model ------------------------------------------------------------------
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    LOKY_MAX_CPU_COUNT=1

# LightGBM needs the OpenMP runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements-deploy.txt backend/
RUN pip install -r backend/requirements-deploy.txt

COPY pipeline/ pipeline/
COPY data/ data/
COPY backend/ backend/
COPY --from=web /web/dist reefresilience/dist

# Fail the build, not the live site, if the model, scored data or web app is missing or will not load.
WORKDIR /app/backend
RUN python check_deploy.py

RUN useradd --system --no-create-home reefcast
USER reefcast

# One worker: each worker would load its own copy of the model and survey index (memory).
# PORT is set by Render, Railway and Cloud Run; Fly.io uses the 8080 default.
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --proxy-headers --forwarded-allow-ips='*' --timeout-graceful-shutdown 10"]
