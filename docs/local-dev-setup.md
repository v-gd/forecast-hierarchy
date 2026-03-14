# Local Development Setup

Complete guide to setting up the forecast-hierarchy component with a local Creatio instance from scratch.

## Prerequisites

- **Node.js** (v18+) and **npm**
- **Angular CLI**: `npm install -g @angular/cli`
- **.NET 8 SDK**: `brew install dotnet@8`
- **.NET 10 SDK**: `brew install dotnet` (for the Angular project itself — uses Angular 21)
- **PostgreSQL client tools** (v17+): `brew install libpq`
- **Podman**: `brew install podman` (container runtime)
- **clio** (Creatio CLI): `dotnet tool install clio -g`
- **Creatio distribution ZIP** (PostgreSQL variant, .NET 8)

> **Note:** clio requires .NET 8, so all clio commands must be run with:
> ```bash
> DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" clio <command>
> ```
> Consider adding an alias to your shell profile:
> ```bash
> alias clio='DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" clio'
> ```

## 1. Install npm dependencies

```bash
cd forecast-hierarchy
npm install
```

## 2. Start infrastructure containers

```bash
# PostgreSQL 17 on port 5436 (5432 likely in use by other projects)
DOCKER_CONFIG=/tmp podman run -d --name postgres-creatio \
  -p 5436:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  docker.io/postgres:17-alpine

# Valkey (Redis-compatible) on port 6379
DOCKER_CONFIG=/tmp podman run -d --name valkey-creatio \
  -p 6379:6379 \
  docker.io/valkey/valkey:8-alpine
```

> The `DOCKER_CONFIG=/tmp` prefix bypasses credential store issues with Podman.

## 3. Configure clio

Open clio settings:
```bash
clio open-settings
```

Add the `db` and `redis` sections to `appsettings.json`:

```json
{
  "db": {
    "local-postgres": {
      "DbType": "postgres",
      "Hostname": "localhost",
      "Port": 5436,
      "Username": "postgres",
      "Password": "postgres",
      "Enabled": true,
      "PgToolsPath": "/opt/homebrew/opt/libpq/bin"
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

## 4. Deploy Creatio

```bash
clio deploy-creatio \
  -e "creatio-local" \
  --db pg \
  --SitePort 9090 \
  --SiteName "creatio-local" \
  --db-server-name local-postgres \
  --drop-if-exists \
  --silent \
  --ZipFile "/path/to/your/Creatio_PostgreSQL.zip"
```

This will:
- Extract the ZIP
- Restore the database to PostgreSQL
- Deploy the application to `~/creatio/` or the current project directory
- Register the `creatio-local` environment in clio
- Configure connection strings automatically

## 5. Start Creatio

clio's deploy may start it automatically. If not:

```bash
clio start -e creatio-local
```

If it fails (e.g., wrong .NET version picked up), start manually:

```bash
cd <creatio-app-directory>
DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec" \
  /opt/homebrew/opt/dotnet@8/libexec/dotnet Terrasoft.WebHost.dll
```

Verify: open http://localhost:9090 — login with `Supervisor` / `Supervisor`.

## 6. Set up Creatio for development

```bash
# Enable file system development mode
clio turn-fsm on -e creatio-local

# Install cliogate (needed for package operations)
clio install-gate -e creatio-local

# Set default environment
# Edit appsettings.json: "ActiveEnvironmentKey": "creatio-local"
```

## 7. Install the component package

```bash
# Build the component for Creatio
npm run build:creatio

# Push the package
clio push-pkg creatio-package -e creatio-local

# Unlock the package for editing
clio unlock-package UsrComponentPackage -e creatio-local

# Set maintainer
clio execute-sql-script -e creatio-local \
  "UPDATE \"SysPackage\" SET \"Maintainer\" = 'Customer' WHERE \"Name\" = 'UsrComponentPackage'"
```

## 8. Set up symlinks for live development

After the package is installed, create symlinks so `npm run build:creatio` immediately updates the deployed files:

```bash
CREATIO_PKG="<creatio-app>/Terrasoft.Configuration/Pkg/UsrComponentPackage/Files/src/js"
CONTENT_DIR="<creatio-app>/conf/content/UsrComponentPackage/src/js"
SOURCE="$(pwd)/creatio-package/Files/src/js"

# Link Pkg directory
rm -f "$CREATIO_PKG/bootstrap.js" "$CREATIO_PKG/forecast-hierarchy.js"
ln -s "$SOURCE/bootstrap.js" "$CREATIO_PKG/bootstrap.js"
ln -s "$SOURCE/forecast-hierarchy.js" "$CREATIO_PKG/forecast-hierarchy.js"

# Link content directory (what Creatio actually serves)
mkdir -p "$CONTENT_DIR"
rm -f "$CONTENT_DIR/bootstrap.js" "$CONTENT_DIR/forecast-hierarchy.js"
ln -s "$SOURCE/bootstrap.js" "$CONTENT_DIR/bootstrap.js"
ln -s "$SOURCE/forecast-hierarchy.js" "$CONTENT_DIR/forecast-hierarchy.js"
```

## Daily development workflow

### Component development (Angular)

```bash
# Start the sandbox dev server (standalone, no Creatio needed)
npm start
# Open http://localhost:4200

# After changes, rebuild for Creatio
npm run build:creatio
# Files are automatically available in Creatio via symlinks
# Hard-refresh the Creatio page (Cmd+Shift+R) to pick up changes
```

### Creatio page development

Edit schemas directly in the filesystem:
```
<creatio-app>/Terrasoft.Configuration/Pkg/<PackageName>/Schemas/
```

Changes to Freedom UI page schemas (JS files) are picked up automatically with FSM enabled — just refresh the page.

For back-end changes (C#), compile:
```bash
clio compile-configuration -e creatio-local
```

### Sync between DB and filesystem

```bash
# DB → filesystem (after making changes in Creatio UI)
clio pkg-to-file-system -e creatio-local

# Filesystem → DB (push a modified package)
clio push-pkg <package-path> -e creatio-local
```

### Restarting Creatio

```bash
clio restart -e creatio-local
```

### Starting infrastructure after reboot

```bash
podman start postgres-creatio valkey-creatio
```

## Two build targets

| Command | Purpose | Output |
|---------|---------|--------|
| `npm start` | Sandbox dev server | http://localhost:4200 |
| `npm run build` | Production sandbox build | `dist/forecast-hierarchy/` |
| `npm run build:creatio` | Creatio deployment build | `creatio-package/Files/src/js/` |

## Ports

| Service | Port |
|---------|------|
| Creatio | 9090 |
| PostgreSQL (Creatio) | 5436 |
| Valkey/Redis | 6379 |
| Angular sandbox | 4200 |
