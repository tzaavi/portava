variable "project" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east1"
}

resource "google_artifact_registry_repository" "portava" {
  project       = var.project
  location      = var.region
  repository_id = "portava"
  format        = "DOCKER"
  description   = "Portava app images"
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project}/portava"
}
