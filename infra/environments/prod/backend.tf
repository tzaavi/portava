terraform {
  backend "gcs" {
    bucket = "portava-prod-tfstate"
    prefix = "terraform/state"
  }
}
