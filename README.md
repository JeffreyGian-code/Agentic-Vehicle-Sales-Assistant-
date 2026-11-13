# Vehicle Sales Assistant (LangChain + PostgreSQL)

A command-line AI assistant that helps Indian customers find vehicles, look up
details, and calculate EMIs. Vehicle data lives in PostgreSQL, which runs in
Docker. No local PostgreSQL install is needed.

```text
User -> LangChain agent -> SearchRequest -> search_vehicles tool
     -> VehicleService -> PostgresVehicleRepository -> PostgreSQL -> list[Vehicle]
```

`Vehicle` represents a row stored in the database. `SearchRequest` represents
the optional filters produced by the LLM. PostgreSQL is reached only through
`VehicleService` and its repository; the tool never constructs SQL itself.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Python 3.12 or 3.13. Python 3.14 works but prints a harmless Pydantic V1 warning from LangChain.
- An [OpenRouter](https://openrouter.ai/) API key

## 1. Create the Python environment

From the project directory:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install "psycopg[binary]==3.3.5"
```

`psycopg[binary]` bundles the PostgreSQL client library (`libpq`), so nothing
else has to be installed on the machine.

## 2. Configure secrets

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set real values:

```text
OPENROUTER_API_KEY=<your OpenRouter key>

# Set to true only with a real LangSmith key, otherwise every request logs a 403 error.
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=<your LangSmith key, optional>
LANGSMITH_PROJECT=vehicle-agent

# Password for the Docker PostgreSQL container
POSTGRES_PASSWORD=<choose-a-strong-password>

# Same password as above, URL-encoded (@ -> %40, : -> %3A, / -> %2F, # -> %23)
DATABASE_URL=postgresql+psycopg://vehicle_app:<same-password>@localhost:5432/vehicle_agent
```

`.env` is ignored by Git; `.env.example` is intentionally safe to commit.
Rotate any API keys that have previously appeared in a terminal, chat,
screenshot, or commit.

## 3. Start PostgreSQL

```powershell
docker compose up -d
```

`docker-compose.yml` starts a `postgres:17` container named `vehicle-pg`. The
user is `vehicle_app` and the database is `vehicle_agent`. Data is stored in the
`vehicle_pgdata` volume, so it survives restarts.

On the **first** start, with an empty volume, PostgreSQL automatically runs the
SQL files in `database/` in alphabetical order:

| File                  | Purpose                                                        |
|-----------------------|----------------------------------------------------------------|
| `database/schema.sql` | Creates the `vehicles` table and its indexes                   |
| `database/seed.sql`   | Loads 200 vehicles (20 Indian-market models × 10 trims each)   |

Check that the data loaded (expect `200`):

```powershell
docker compose exec postgres psql -U vehicle_app -d vehicle_agent -c "SELECT COUNT(*) FROM vehicles;"
```

`seed.sql` clears and replaces the `vehicles` table. Never run it against a
database that contains real data.

## 4. Run the assistant

```powershell
python main.py
```

Try:

- `Find Honda sedans under 10 lakh`
- `Show me Toyota vehicles`
- `What is the EMI on 12 lakh at 9% for 5 years?`

Type `exit` to quit.

## Day-to-day commands

| Task                                     | Command                                  |
|------------------------------------------|------------------------------------------|
| Start the database                       | `docker compose start`                   |
| Stop the database                        | `docker compose stop`                    |
| Check status                             | `docker compose ps`                      |
| Open a SQL shell                         | `docker compose exec postgres psql -U vehicle_app -d vehicle_agent` |
| Reset everything (re-runs schema + seed) | `docker compose down -v` then `docker compose up -d` |

Changes to `database/*.sql` or `POSTGRES_PASSWORD` only take effect after a
reset, because the init scripts and password apply only to a fresh volume.

## Running tests

```powershell
python -m pytest
```

`app/tests/test_vehicle_service.py` is an integration test and needs the
database container to be running.

## Continuous integration

[Vehicle Agent CI](.github/workflows/ci.yml) runs on pull requests targeting
`main`, pushes to `main`, and manual runs from GitHub's Actions tab. Two jobs
run independently:

- **Backend:** Python 3.12, cached pip downloads, and a disposable PostgreSQL 17
  service. CI loads `database/schema.sql` followed by `database/seed.sql`, then
  runs `python -m pytest`. The database credentials are CI-only values; no
  repository secrets are required. AI calls use the existing test doubles,
  the OpenRouter key is empty, and LangSmith tracing is disabled.
- **Frontend:** Node.js 24, cached npm downloads, and `npm ci` using
  `frontend/package-lock.json`, followed by tests, lint, and a production build.

The workflow has read-only repository permissions. New runs cancel older runs
for the same pull request or branch. Backend jobs time out after 15 minutes;
frontend jobs time out after 10 minutes.

After pushing the workflow and letting it run, configure a branch protection
rule or ruleset for `main` in GitHub's repository settings. Require pull requests
and require both **Backend** and **Frontend** status checks before merging.
These repository settings must be configured separately from the workflow file.
Deployment is not part of this validation workflow.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `password authentication failed for user "vehicle_app"` | `DATABASE_URL` password does not match the one the volume was created with. Fix `.env`, then reset (`docker compose down -v`, `docker compose up -d`). |
| `relation "vehicles" does not exist` | The volume was created before `database/` existed. Reset as above. |
| `port is already allocated` / port 5432 in use | A local PostgreSQL service is running. Stop it, or set `POSTGRES_PORT=5433` in `.env` and use `:5433` in `DATABASE_URL`. |
| `LangSmithError ... 403 Forbidden` | Set `LANGSMITH_TRACING=false` or provide a valid `LANGSMITH_API_KEY`. |
| `DATABASE_URL is not configured.` | `.env` is missing or does not define `DATABASE_URL`. |

## Notes on the implementation

- Queries use SQLAlchemy bound parameters (`:brand`, `:max_price`, …) rather than string interpolation, preventing SQL injection.
- Connections come from a SQLAlchemy engine with `pool_pre_ping=True` (`app/database.py`) and are released by context managers after each call.
- Brand, model, vehicle type and price are indexed. Text matching is case-insensitive.
- The `model` filter is an exact match on the full name including the trim (e.g. `City VX`), so a search for just `City` returns nothing.
