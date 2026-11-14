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

`docker-compose.yml` starts PostgreSQL 18 as `vehicle-pg`, using the
`aurion_pg18data` volume. The default user is `vehicle_app` and database is
`vehicle_agent`. The original PostgreSQL 17 volume is retained separately.

On the first startup with an empty volume, Docker automatically loads the
repository's initialization files in order:

1. `database/schema.sql` creates the original tables, constraints and indexes.
2. `database/seed.sql` loads the original 200 `vehicles` and 200 `vehicles_backup`
   rows, including the separate `variant` field and identity sequence state.

No external backup file or local PostgreSQL installation is needed. Everyone
cloning this revision starts with the same catalogue. Each machine keeps its
own independent database; later edits are not synchronized between machines.
Existing volumes are preserved and are not seeded again on restart.

Verify the initialized data (expect 200):

```powershell
docker compose exec postgres psql -U vehicle_app -d vehicle_agent -c "SELECT COUNT(*) FROM vehicles;"
```

See [the database setup guide](docs/database-restore.md) for persistence and
existing-volume details.

The catalogue has separate `model` and optional `variant` columns; both are
returned by the repository and can be searched independently.

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
| Database initialization details | See [database setup guide](docs/database-restore.md) |

The database volume survives restarts. Do not use `docker compose down -v` unless
you intend to delete its data. Database initialization credentials only apply
when the volume is first created. The SQL files in `database/` contain the
original catalogue and run automatically only for a fresh volume.

## Running tests

```powershell
python -m pytest
```

`app/tests/test_vehicle_service.py` is an integration test. Run the suite with
`DATABASE_URL` pointing to a separate PostgreSQL 18 test database initialized
with `database/schema.sql` and `database/seed.sql`, as CI does. The suite uses
the original catalogue and inserts a temporary variant record for one test;
keep tests separate from databases you edit or use for deployment.

## Continuous integration

See [the GitHub Actions guide](docs/github-actions.md) for a simple explanation
of the setup and why each part is needed.

[Vehicle Agent CI](.github/workflows/ci.yml) runs on pull requests targeting
`main`, pushes to `main`, and manual runs from GitHub's Actions tab. Two jobs
run independently:

- **Backend:** Python 3.12, cached pip downloads, and a disposable PostgreSQL 18
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
| `password authentication failed for user "vehicle_app"` | `DATABASE_URL` password does not match the one the volume was created with. Correct `.env` to match the existing database credentials; do not delete the data volume. |
| `relation "vehicles" does not exist` | Check `docker compose logs postgres`; initialization only runs on empty volumes. See the database setup guide for existing volumes. |
| `port is already allocated` / port 5432 in use | A local PostgreSQL service is running. Stop it, or set `POSTGRES_PORT=5433` in `.env` and use `:5433` in `DATABASE_URL`. |
| `LangSmithError ... 403 Forbidden` | Set `LANGSMITH_TRACING=false` or provide a valid `LANGSMITH_API_KEY`. |
| `DATABASE_URL is not configured.` | `.env` is missing or does not define `DATABASE_URL`. |

## Notes on the implementation

- Each browser session gets 7 chat requests per 24-hour window, starting with its first request. Accepted requests count even if generation fails or is cancelled. Reset conversation clears chat context while keeping the session budget and per-IP limits. The header displays calls used.
- Session budgets persist in `.chat-usage.sqlite3`. Set `CHAT_USAGE_DATABASE` to a writable persistent file path in deployment to retain counts across restarts; servers sharing this file share the budget. Conversation history still uses the agent's in-memory checkpointer.
- The developer note opens on arrival and can be reopened with **Note**. System status results dismiss on click or after 5 seconds.
- Queries use SQLAlchemy bound parameters (`:brand`, `:max_price`, …) rather than string interpolation, preventing SQL injection.
- Connections come from a SQLAlchemy engine with `pool_pre_ping=True` (`app/database.py`) and are released by context managers after each call.
- Brand, model, vehicle type and price are indexed. Text matching is case-insensitive.
- `model` and `variant` are separate, case-insensitive exact-match filters (for example, model `City` and variant `VX`).
- Vehicle searches return up to three results, lowest listed price first. Broad searches show one matching variant per brand/model; specific model searches show variants. Optional inclusive `min_price`/`max_price` bounds are applied before selection. Use `sort_order: "price_desc"` for highest prices first; equal prices use ID order.
