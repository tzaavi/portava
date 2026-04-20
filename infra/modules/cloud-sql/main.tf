variable "project" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "env" {
  type = string # "stage" or "prod"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "dashboard_run_sa_email" {
  type = string
}

variable "portal_run_sa_email" {
  type = string
}

# NOTE: Cloud SQL supports up to PostgreSQL 16 as of this writing.
# The app schema uses uuidv7() which requires PostgreSQL 18+.
# For Cloud SQL, replace uuidv7() defaults with gen_random_uuid() or
# app-side UUID generation until Cloud SQL adds PG18 support.
resource "google_sql_database_instance" "main" {
  project          = var.project
  name             = "portava-${var.env}"
  region           = var.region
  database_version = "POSTGRES_16"

  deletion_protection = var.env == "prod"

  settings {
    tier              = var.env == "prod" ? "db-g1-small" : "db-f1-micro"
    availability_type = var.env == "prod" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.env == "prod"
    }

    ip_configuration {
      ipv4_enabled = true
    }

    insights_config {
      query_insights_enabled = var.env == "prod"
    }
  }
}

resource "google_sql_database" "portava" {
  project  = var.project
  instance = google_sql_database_instance.main.name
  name     = "portava"
}

resource "google_sql_user" "portava" {
  project  = var.project
  instance = google_sql_database_instance.main.name
  name     = "portava"
  password = var.db_password
}

# Allow Cloud Run service accounts to connect via Cloud SQL Auth Proxy
resource "google_project_iam_member" "dashboard_sql_client" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.dashboard_run_sa_email}"
}

resource "google_project_iam_member" "portal_sql_client" {
  project = var.project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.portal_run_sa_email}"
}

output "instance_name" {
  value = google_sql_database_instance.main.name
}

output "connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "database_url" {
  value     = "postgresql://portava:${var.db_password}@localhost/portava?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
  sensitive = true
}
