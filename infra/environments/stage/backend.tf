terraform {
  backend "gcs" {
    bucket = "portava-stage-tfstate"
    prefix = "terraform/state"
  }
}
