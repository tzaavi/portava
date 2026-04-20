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
