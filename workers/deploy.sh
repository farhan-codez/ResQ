#!/bin/bash
# Deploy detection worker to Cloud Run
# Usage: ./deploy.sh [project-id] [region]

set -e

PROJECT_ID=${1:-$GOOGLE_CLOUD_PROJECT}
REGION=${2:-us-central1}
SERVICE_NAME="resq-detection-worker"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project-id> [region]"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

echo "Building and deploying detection worker..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Build and push image
gcloud builds submit --tag $IMAGE_NAME --file workers/Dockerfile .

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --no-allow-unauthenticated \
  --service-account resq-worker@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,EARTH_ENGINE_PROJECT=$EARTH_ENGINE_PROJECT,EE_CLIENT_EMAIL=$EE_CLIENT_EMAIL,EE_PRIVATE_KEY=$EE_PRIVATE_KEY" \
  --cpu 1 \
  --memory 512Mi \
  --max-instances 1 \
  --min-instances 0

# Create Cloud Scheduler job to run every 6 hours
gcloud scheduler jobs create http resq-detection-worker-schedule \
  --schedule="0 */6 * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$SERVICE_NAME" \
  --http-method=POST \
  --oauth-service-account-email=resq-worker@$PROJECT_ID.iam.gserviceaccount.com \
  --location=$REGION \
  --project=$PROJECT_ID 2>/dev/null || \
gcloud scheduler jobs update http resq-detection-worker-schedule \
  --schedule="0 */6 * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$SERVICE_NAME" \
  --http-method=POST \
  --oauth-service-account-email=resq-worker@$PROJECT_ID.iam.gserviceaccount.com \
  --location=$REGION \
  --project=$PROJECT_ID

echo "Deployment complete!"
echo "Worker URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$SERVICE_NAME"