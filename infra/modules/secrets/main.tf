variable "project" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "drive_sa_key_b64" {
  type      = string
  sensitive = true
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project
  secret_id = "database-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

resource "google_secret_manager_secret" "drive_sa_key" {
  project   = var.project
  secret_id = "drive-service-account-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "drive_sa_key" {
  secret      = google_secret_manager_secret.drive_sa_key.id
  secret_data = base64decode(var.drive_sa_key_b64)
}

output "database_url_secret_id" {
  value = google_secret_manager_secret.database_url.secret_id
}

output "drive_sa_key_secret_id" {
  value = google_secret_manager_secret.drive_sa_key.secret_id
}
