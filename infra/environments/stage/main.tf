provider "google" {
  project = var.project
  region  = var.region
}

provider "google-beta" {
  project = var.project
  region  = var.region
}

module "apis" {
  source  = "../../modules/apis"
  project = var.project
}

module "service_accounts" {
  source  = "../../modules/service-accounts"
  project = var.project

  depends_on = [module.apis]
}

# Store the Drive service account key in Secret Manager
resource "google_secret_manager_secret" "drive_sa_key" {
  project   = var.project
  secret_id = "drive-service-account-key"

  replication {
    auto {}
  }

  depends_on = [module.apis]
}

resource "google_secret_manager_secret_version" "drive_sa_key" {
  secret      = google_secret_manager_secret.drive_sa_key.id
  secret_data = base64decode(module.service_accounts.drive_sa_key_b64)
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project
  secret_id = "database-url"

  replication {
    auto {}
  }

  depends_on = [module.apis]
}

resource "google_secret_manager_secret" "webhook_token" {
  project   = var.project
  secret_id = "webhook-token"

  replication {
    auto {}
  }

  depends_on = [module.apis]
}

module "cloud_run" {
  source  = "../../modules/cloud-run"
  project = var.project
  region  = var.region
  env     = "stage"

  registry_url           = "us-east1-docker.pkg.dev/${var.project}/portava"
  sql_connection_name    = "" # set after Cloud SQL is provisioned
  dashboard_run_sa_email = module.service_accounts.dashboard_run_sa_email
  portal_run_sa_email    = module.service_accounts.portal_run_sa_email
  webhook_run_sa_email   = module.service_accounts.webhook_run_sa_email
  pubsub_topic_name      = module.pubsub.topic_name
  webhook_token_secret_id = google_secret_manager_secret.webhook_token.secret_id
  database_url_secret_id  = google_secret_manager_secret.database_url.secret_id
  drive_sa_key_secret_id  = google_secret_manager_secret.drive_sa_key.secret_id

  depends_on = [module.apis, module.service_accounts]
}

module "pubsub" {
  source               = "../../modules/pubsub"
  project              = var.project
  webhook_url          = module.cloud_run.webhook_url
  webhook_run_sa_email = module.service_accounts.webhook_run_sa_email

  depends_on = [module.cloud_run]
}

output "dashboard_url" {
  value = module.cloud_run.dashboard_url
}

output "portal_url" {
  value = module.cloud_run.portal_url
}

output "webhook_url" {
  value = module.cloud_run.webhook_url
}
