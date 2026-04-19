dev-dashboard:
    pnpm --filter @portava/dashboard dev

dev-portal:
    pnpm --filter @portava/portal dev

db-start:
    docker compose up -d db

db-stop:
    docker compose stop db

db-reset:
    docker exec -i portava-db-1 psql -U portava postgres -c "DROP DATABASE IF EXISTS portava;" -c "CREATE DATABASE portava;"
    docker exec -i portava-db-1 psql -U portava portava < db/schema.sql
