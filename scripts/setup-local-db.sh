#!/bin/bash
set -e

# Configuration
DB_NAME="healthcare_dev"
DB_USER="app_user"
DB_PASSWORD="local_dev_only"
CONTAINER_NAME="healthcare-postgres-dev"

# Create Docker container
echo "Creating PostgreSQL container..."
docker run --name $CONTAINER_NAME \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -p 5432:5432 \
  -d postgres:14 