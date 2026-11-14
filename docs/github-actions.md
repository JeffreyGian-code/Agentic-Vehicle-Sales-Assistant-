# How GitHub Actions is set up

GitHub Actions checks the project automatically when code changes. This is
called continuous integration, or CI. It helps catch problems before changes
are merged into `main`.

The setup lives in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
The workflow is named **Vehicle Agent CI**.

## When it runs

| Event | Why it runs |
|---|---|
| A pull request targets `main` | Check proposed changes before merging. |
| Code is pushed to `main` | Check the code that reached the main branch. |
| Someone starts it manually | Allow checks to run without a new commit. |

A push to another branch does not trigger this workflow by itself. If that
branch has an open pull request into `main`, new commits trigger the PR checks.

## Two separate jobs

The workflow has two jobs: **Backend** and **Frontend**. They can run at the
same time because neither depends on the other. Each uses a fresh Ubuntu
machine provided by GitHub.

### Backend

This job checks the Python application:

1. Download the repository code.
2. Set up Python **3.12**.
3. Install packages from `requirements.txt`, plus the matching
   `psycopg[binary]` package for connecting to PostgreSQL.
4. Prepare a temporary PostgreSQL **18** database.
5. Run all Python tests with `python -m pytest`.

The database runs in its own service container. GitHub waits for its health
check to pass before starting the job's steps. The workflow then runs these
files in order:

- `database/schema.sql` creates both original tables, constraints, and indexes.
- `database/seed.sql` loads the 200 original vehicles and 200 backup rows, including variants.

This is necessary because the vehicle tests query a real database and expect
specific records from the original catalogue. If either SQL file fails, the initialization step
fails immediately.

`DATABASE_URL` points the application to this temporary database on port
`5432`. Its username, password, and database name are all `vehicle_ci`. These
are disposable test values. Each run gets a fresh database, which is removed
when the job finishes.

The tests use fake agents and mocked AI responses, so they do not need a paid
AI request. `OPENROUTER_API_KEY` is empty and `LANGSMITH_TRACING` is `false`.
No repository API secrets are needed for these checks.

### Frontend

This job checks the React application. It sets up Node.js **24** and runs
these commands inside `frontend/`:

| Command | What it checks |
|---|---|
| `npm ci` | Install the dependency versions recorded in `package-lock.json`. |
| `npm test` | Run the frontend tests. |
| `npm run lint` | Look for code issues using ESLint. |
| `npm run build` | Check TypeScript and create a production build using Vite. |

Each check catches a different kind of problem. For example, tests can pass
while TypeScript still reports an error during the build. A failed step stops
the remaining steps in that job.

## Settings that keep runs efficient

| Setting | Why it is used |
|---|---|
| pip and npm caching | Reuse downloaded packages to make later runs faster. Dependencies are still installed each time. |
| Cache keys based on dependency files | Refresh the cache when `requirements.txt` or `frontend/package-lock.json` changes. |
| Cancel older runs for the same PR or branch | Focus on the latest code instead of finishing outdated checks. |
| Backend timeout: 15 minutes | Stop the job if installation or testing gets stuck. |
| Frontend timeout: 10 minutes | Stop the job if installation or building gets stuck. |
| `contents: read` permission | Let the workflow read the repository without granting write access. |

## How this works with the `main` ruleset

The workflow reports whether **Backend** and **Frontend** passed. To make
these checks mandatory before merging, configure a GitHub branch ruleset for
`main` that requires pull requests and both status checks.

The ruleset is a separate repository setting; this workflow file does not
create it. Without a required-check rule, a failed workflow does not by itself
prevent someone from merging a PR.

If the check names are not available in the ruleset editor, let the workflow
run once, then select **Backend** and **Frontend**.

## How to view results

1. Open the repository on GitHub and select **Actions**.
2. Select **Vehicle Agent CI**, then open a run.
3. Open **Backend** or **Frontend** to see its steps and output.
4. If a step failed, read its error, fix the code, and push another commit.

You can also see the checks on the pull request. To start a run manually,
open **Actions → Vehicle Agent CI → Run workflow**.

This workflow validates the project. It does not deploy the application or
publish the frontend build.
