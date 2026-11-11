#!/bin/bash
# Deploy the detection worker to Cloud Run and schedule it.
# Usage: ./deploy.sh [project-id] [region]
#
# Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#               EARTH_ENGINE_PROJECT, EE_CLIENT_EMAIL, EE_PRIVATE_KEY

set -e

PROJECT_ID=${1:-$GOOGLE_CLOUD_PROJECT}
REGION=${2:-us-central1}
SERVICE_NAME="resq-detection-worker"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
SCHEDULER_JOB="resq-detection-worker-schedule"
SERVICE_ACCOUNT="resq-worker@$PROJECT_ID.iam.gserviceaccount.com"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project-id> [region]"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY EARTH_ENGINE_PROJECT EE_CLIENT_EMAIL EE_PRIVATE_KEY; do
  if [ -z "${!var}" ]; then
    echo "Missing $var"
    exit 1
  fi
done

echo "Building and deploying detection worker..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

gcloud builds submit --tag "$IMAGE_NAME" --file workers/Dockerfile .

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --region "$REGION" \
  --platform managed \
  --no-allow-unauthenticated \
  --service-account "$SERVICE_ACCOUNT" \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,EARTH_ENGINE_PROJECT=$EARTH_ENGINE_PROJECT,EE_CLIENT_EMAIL=$EE_CLIENT_EMAIL,EE_PRIVATE_KEY=$EE_PRIVATE_KEY" \
  --cpu 1 \
  --memory 1Gi \
  --max-instances 1 \
  --min-instances 0

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')

echo "Scheduling daily runs..."
gcloud scheduler jobs create http "$SCHEDULER_JOB" \
  --schedule="0 3 * * *" \
  --uri="$SERVICE_URL" \
  --http-method=POST \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$SERVICE_URL" \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud scheduler jobs update http "$SCHEDULER_JOB" \
  --schedule="0 3 * * *" \
  --uri="$SERVICE_URL" \
  --http-method=POST \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$SERVICE_URL" \
  --location="$REGION" \
  --project="$PROJECT_ID"

echo "Deployment complete!"
echo "Worker URL: $SERVICE_URL"
