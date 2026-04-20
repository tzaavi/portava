variable "project" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "env" {
  type = string
}

variable "registry_url" {
  type = string
}

variable "sql_connection_name" {
  type = string
}

variable "dashboard_run_sa_email" {
  type = string
}

variable "portal_run_sa_email" {
  type = string
}

variable "database_url_secret_id" {
  type = string
}

variable "drive_sa_key_secret_id" {
  type = string
}

variable "min_instances" {
  type    = number
  default = 0
}

locals {
  common_env = [
    {
      name = "DATABASE_URL"
      value_source = {
        secret_key_ref = {
          secret  = var.database_url_secret_id
          version = "latest"
        }
      }
    },
    {
      name = "GOOGLE_SERVICE_ACCOUNT_JSON"
      value_source = {
        secret_key_ref = {
          secret  = var.drive_sa_key_secret_id
          version = "latest"
        }
      }
    },
    {
      name  = "NODE_ENV"
      value = var.env == "prod" ? "production" : "staging"
    },
  ]
}

resource "google_cloud_run_v2_service" "dashboard" {
  project  = var.project
  name     = "dashboard"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.dashboard_run_sa_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.env == "prod" ? 10 : 3
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.sql_connection_name]
      }
    }

    containers {
      image = "${var.registry_url}/dashboard:latest"
      name  = "dashboard"

      ports {
        container_port = 3001
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name = env.value.name
          dynamic "value_source" {
            for_each = try([env.value.value_source], [])
            content {
              secret_key_ref {
                secret  = value_source.value.secret_key_ref.secret
                version = value_source.value.secret_key_ref.version
              }
            }
          }
          value = try(env.value.value, null)
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service" "portal" {
  project  = var.project
  name     = "portal"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.portal_run_sa_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.env == "prod" ? 10 : 3
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.sql_connection_name]
      }
    }

    containers {
      image = "${var.registry_url}/portal:latest"
      name  = "portal"

      ports {
        container_port = 3002
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name = env.value.name
          dynamic "value_source" {
            for_each = try([env.value.value_source], [])
            content {
              secret_key_ref {
                secret  = value_source.value.secret_key_ref.secret
                version = value_source.value.secret_key_ref.version
              }
            }
          }
          value = try(env.value.value, null)
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}

# Allow unauthenticated (public) access to both services
resource "google_cloud_run_v2_service_iam_member" "dashboard_public" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.dashboard.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "portal_public" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.portal.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "dashboard_url" {
  value = google_cloud_run_v2_service.dashboard.uri
}

output "portal_url" {
  value = google_cloud_run_v2_service.portal.uri
}
