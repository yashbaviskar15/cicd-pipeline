variable "name" {
  description = "Name prefix for the repositories"
  type        = string
}

variable "repositories" {
  description = "List of repository names to create (e.g. backend, frontend)"
  type        = list(string)
}

variable "image_tag_mutability" {
  description = "IMMUTABLE prevents tags being overwritten (recommended)"
  type        = string
  default     = "MUTABLE"
}

variable "keep_last_images" {
  description = "How many tagged images to retain in the lifecycle policy"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
