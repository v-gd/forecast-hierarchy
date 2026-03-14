# Creatio Local Development Environment Setup

How to deploy Creatio locally and configure clio for development.

## Prerequisites

| Tool | Install command | Notes |
|------|----------------|-------|
| Node.js 18+ | `brew install node` | |
| .NET 8 SDK | `brew install dotnet@8` | Required by clio |
| PostgreSQL client 17+ | `brew install libpq` | For `pg_restore` |
| Podman | `brew install podman` | Container runtime |
| clio | `dotnet tool install clio -g` | Creatio CLI |
| Creatio ZIP | Download from Creatio | PostgreSQL variant, .NET 8 |

> **All clio commands** require .NET 8 runtime. Add this alias to `~/.zshrc`:
> ```bash
> alias clio='DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" clio'
> ```

---

## 1. Start Infrastructure Containers

```bash
# PostgreSQL 17 on port 5436 (5432 likely used by other projects)
DOCKER_CONFIG=/tmp podman run -d --name postgres-creatio \
  -p 5436:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  docker.io/postgres:17-alpine

# Valkey (Redis-compatible) on port 6379
DOCKER_CONFIG=/tmp podman run -d --name valkey-creatio \
  -p 6379:6379 docker.io/valkey/valkey:8-alpine
```

> Use `DOCKER_CONFIG=/tmp` to bypass Podman credential store issues (gcloud, desktop helpers).

> PostgreSQL must be version 17+ — earlier versions fail with `unsupported version` or `unrecognized configuration parameter "transaction_timeout"` errors during restore.

---

## 2. Configure clio

Run `clio open-settings` and add the `db` and `redis` sections:

```json
{
  "ActiveEnvironmentKey": "creatio-local",
  "db": {
    "local-postgres": {
      "DbType": "postgres",
      "Hostname": "localhost",
      "Port": 5436,
      "Username": "postgres",
      "Password": "postgres",
      "PgToolsPath": "/opt/homebrew/opt/libpq/bin",
      "Enabled": true
    }
  },
  "defaultRedis": "local-valkey",
  "redis": {
    "local-valkey": {
      "Hostname": "localhost",
      "Port": 6379,
      "Enabled": true
    }
  }
}
```

> `PgToolsPath` must point to a PostgreSQL 17+ client. The default Postgres.app may have an older version. Use `brew install libpq` and point to `/opt/homebrew/opt/libpq/bin`.

---

## 3. Deploy Creatio

```bash
clio deploy-creatio -e "creatio-local" --db pg --SitePort 9090 \
  --SiteName "creatio-local" --db-server-name local-postgres \
  --drop-if-exists --silent \
  --ZipFile "/path/to/Creatio_PostgreSQL.zip"
```

This will:
- Extract the ZIP
- Restore the database to PostgreSQL
- Deploy the application
- Configure connection strings
- Register the `creatio-local` environment in clio

> **`--SiteName` is required** — without it, clio prompts interactively and hangs in non-interactive contexts.

---

## 4. Start Creatio

Clio's deploy may start it automatically. If not:

```bash
cd <creatio-app-directory>
DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" \
  /opt/homebrew/opt/dotnet@8/libexec/dotnet Terrasoft.WebHost.dll
```

> Creatio 8.3.3 needs .NET 8 runtime. If only .NET 10 is installed, the default `dotnet` won't work — you must specify the .NET 8 path explicitly.

Verify: open http://localhost:9090 — login with `Supervisor` / `Supervisor`.

---

## 5. Enable Development Mode

```bash
clio turn-fsm on -e creatio-local    # File system development mode
clio install-gate -e creatio-local   # Clio API gateway (needed for push-pkg, pkg-list, etc.)
```

File System Mode (FSM) means:
- Creatio reads page schemas from `Pkg/*/Schemas/` on the filesystem
- Changes to Freedom UI page schemas (JS files) are picked up on page refresh
- No compilation needed for front-end schema changes

---

## 6. Restarting After Reboot

```bash
# Start infrastructure
podman start postgres-creatio valkey-creatio

# Start Creatio
cd <creatio-app-directory>
DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" \
  /opt/homebrew/opt/dotnet@8/libexec/dotnet Terrasoft.WebHost.dll
```

---

## clio Command Reference

```bash
clio ping -e creatio-local                    # Test connection
clio restart -e creatio-local                 # Restart Creatio
clio push-pkg <path> -e creatio-local         # Install/update package
clio unlock-package <name> -e creatio-local   # Unlock for editing
clio pkg-to-file-system -e creatio-local      # Sync DB → filesystem
clio compile-configuration -e creatio-local   # Compile C# code
clio turn-fsm on -e creatio-local             # Enable file system mode
clio get-pkg-list -e creatio-local            # List installed packages
clio execute-sql-script -e creatio-local "SQL" # Run SQL
clio start -e creatio-local                   # Start Creatio service
clio stop -e creatio-local                    # Stop Creatio service
clio new-ui-project <name> -v usr --package <pkg> --empty true -e creatio-local --silent
```

---

## File Content System

Creatio serves static file content through:

1. `Pkg/{PackageName}/Files/` — source files in the package
2. `conf/content/_FileContentBootstraps.js` — maps package names to bootstrap files
3. `conf/content/_FileContentDescriptors.js` — maps file paths to content hashes (cache busting)
4. `conf/content/{PackageName}/...` — actual files served to the browser

**URL pattern:** `http://localhost:9090/conf/content/{PackageName}/path/to/file.js`
(No `/0/` prefix — that's for API endpoints only)

`clio push-pkg` handles all of this automatically — it copies files, updates hashes, and registers bootstraps.

---

## Port Allocation

| Service | Port |
|---------|------|
| Creatio | 9090 |
| PostgreSQL (Creatio) | 5436 |
| Valkey/Redis | 6379 |
| Angular dev server | 4200 |

---

## Cloud Trial Limitations

`clio push-pkg` and `clio install-gate` fail against Creatio cloud trials — the upload API returns HTML instead of JSON. Options:
- Deploy locally (this guide)
- Upload packages manually through Configuration > Install from file in the Creatio UI
- For cliogate: download `cliogate.gz` from `~/.dotnet/tools/.store/clio/*/tools/net8.0/any/cliogate/` and upload manually
