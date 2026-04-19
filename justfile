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

db-psql:
    psql postgresql://portava:portava@localhost:5433/portava

db-seed:
    docker exec -i portava-db-1 psql -U portava portava < db/seed.sql

db-reset-seed: db-reset db-seed
