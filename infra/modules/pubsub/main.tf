variable "project" {
  type = string
}

variable "webhook_url" {
  type        = string
  description = "Public URL of the webhook Cloud Run service"
}

variable "webhook_run_sa_email" {
  type = string
}

resource "google_pubsub_topic" "drive_notifications" {
  project = var.project
  name    = "drive-notifications"
}

# Grant the webhook service account permission to publish to this topic
resource "google_pubsub_topic_iam_member" "webhook_publisher" {
  project = var.project
  topic   = google_pubsub_topic.drive_notifications.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.webhook_run_sa_email}"
}

# Push subscription: Pub/Sub calls /pubsub on the webhook service
resource "google_pubsub_subscription" "webhook_push" {
  project = var.project
  name    = "drive-notifications-push"
  topic   = google_pubsub_topic.drive_notifications.name

  ack_deadline_seconds = 60

  push_config {
    push_endpoint = "${var.webhook_url}/pubsub"
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }
}

output "topic_name" {
  value = "projects/${var.project}/topics/${google_pubsub_topic.drive_notifications.name}"
}
