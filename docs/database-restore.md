# Shared catalogue setup

The repository includes everything needed to initialize PostgreSQL 18 with
the original Aurion database. No local PostgreSQL installation or external
Aurion_Data.sql backup is required.

## Fresh clone

1. Start Docker Desktop.
2. Copy .env.example to .env and set POSTGRES_PASSWORD and the matching
   DATABASE_URL password. Add your own OpenRouter key to use the assistant.
3. Run `docker compose up -d --wait postgres`, or use `run.bat` for the full app.

Docker creates a persistent aurion_pg18data volume and runs these read-only
initialization files in order:

- database/schema.sql: both tables, constraints, identity column, and indexes.
- database/seed.sql: the 200 original vehicles and 200 vehicles_backup records,
  including variants, original IDs and prices, plus the identity sequence state.

CI uses these same two files, so tests and fresh local setups share the catalogue.
The SQL files contain vehicle catalogue data only, without passwords or accounts
from the machine that produced the backup.

```powershell
docker compose exec postgres psql -U vehicle_app -d vehicle_agent -c "\d public.vehicles"
docker compose exec postgres psql -U vehicle_app -d vehicle_agent -c "SELECT COUNT(*) FROM vehicles; SELECT * FROM vehicles ORDER BY id LIMIT 10;"
```

Expected vehicle count: 200. For example, ID 1 is Honda Amaze, variant Base,
priced at 800000 INR.

## Persistence and existing volumes

Initialization runs once, only when PostgreSQL's data directory is empty.
Restarts preserve changes and do not reload the catalogue. Existing restored
Aurion databases already have the right data and need no manual import.
Updating the repository SQL does not change an existing database automatically.

An older empty or partially initialized database requires explicit repair or a
new volume; restarting alone does not rerun the initialization scripts. Keep
backups of any data you want to retain before replacing a volume.

Do not attach a PostgreSQL 17 volume to PostgreSQL 18. The original version 17
volume on the migration machine remains separate and untouched. Do not use
`docker compose down -v` unless you intend to delete the active database data.
Do not manually rerun seed.sql over an existing catalogue; it inserts original
records and intentionally does not truncate existing tables.

Every clone starts with the same data but has its own database. Later changes
are local to that database. A shared live database would require shared hosting
and a common connection configuration.

Keep DATABASE_URL in .env aligned with POSTGRES_PASSWORD, POSTGRES_USER,
POSTGRES_DB, and POSTGRES_PORT (defaults vehicle_app, vehicle_agent, 5432).
URL-encode special characters in connection-string passwords. Credentials stay
in .env and are not committed. The application returns model and variant as
separate fields, supports exact case-insensitive matching for each, and displays
them together in assistant responses.
