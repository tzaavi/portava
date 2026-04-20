variable "project" {
  type = string
}

# Drive service account — used by app servers to call Google Drive API
resource "google_service_account" "drive" {
  project      = var.project
  account_id   = "portava-drive"
  display_name = "Portava Drive API"
}

resource "google_service_account_key" "drive" {
  service_account_id = google_service_account.drive.name
}

# Cloud Run identity for dashboard
resource "google_service_account" "dashboard_run" {
  project      = var.project
  account_id   = "dashboard-run"
  display_name = "Dashboard Cloud Run"
}

# Cloud Run identity for portal
resource "google_service_account" "portal_run" {
  project      = var.project
  account_id   = "portal-run"
  display_name = "Portal Cloud Run"
}

# Cloud Run SAs need to access Cloud SQL
resource "google_project_iam_member" "dashboard_cloudsql" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.dashboard_run.email}"
}

resource "google_project_iam_member" "portal_cloudsql" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.portal_run.email}"
}

# Cloud Run SAs need to read secrets
resource "google_project_iam_member" "dashboard_secrets" {
  project = var.project
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dashboard_run.email}"
}

resource "google_project_iam_member" "portal_secrets" {
  project = var.project
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.portal_run.email}"
}

output "drive_sa_email" {
  value = google_service_account.drive.email
}

output "drive_sa_key_b64" {
  value     = google_service_account_key.drive.private_key
  sensitive = true
}

output "dashboard_run_sa_email" {
  value = google_service_account.dashboard_run.email
}

output "portal_run_sa_email" {
  value = google_service_account.portal_run.email
}
