# Car management

**NOTE** This project is 100% vibe-coded :')

Track details, fuel uplifts, defects and maintenance of your cars. See [plan.md](plan.md) for the design.

npm workspaces monorepo:

- `shared/` — Zod schemas, API types and fuel statistics, used by both sides
- `backend/` — Express 5 + Prisma 7 (MySQL)
- `frontend/` — React 19 + Vite, React Router, TanStack Query

## Development

Requires Node.js 22+ and Docker.

```sh
npm install
cp backend/.env.example backend/.env
npm run hash-password -w backend       # paste the output into backend/.env
openssl rand -base64 48                # paste as SESSION_SECRET in backend/.env
# for local http development, also set COOKIE_SECURE=false

npm run db:up                          # MySQL on localhost:3307 (override with MYSQL_PORT)
npm run db:migrate -w backend          # apply migrations
npm run dev                            # backend on :3000, frontend on http://localhost:5173
```

The Vite dev server listens on your network too, so you can open it on your phone via your machine's IP.

Other scripts:

| Command                                          |                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `npm test`                                       | Unit tests (shared fuel stats and number parsing, backend auth)  |
| `npm run typecheck`                              | Type-check all workspaces                                        |
| `npm run build`                                  | Production build of all workspaces                               |
| `npm run db:migrate -w backend -- --name <name>` | Create a migration after changing `backend/prisma/schema.prisma` |

## Deployment

Both images are built from the repository root:

```sh
docker build -f backend/Dockerfile -t car-management-backend .
docker build -f frontend/Dockerfile -t car-management-frontend .
```

**Backend** (port 3000) applies pending migrations on start. Environment:

| Variable             |                                                      |
| -------------------- | ---------------------------------------------------- |
| `DATABASE_URL`       | `mysql://user:password@host:3306/database`           |
| `AUTH_USERNAME`      | Login username                                       |
| `AUTH_PASSWORD_HASH` | bcrypt hash, from `npm run hash-password -w backend` |
| `SESSION_SECRET`     | At least 32 random characters                        |
| `COOKIE_SECURE`      | `true` (default) when served over https              |

bcrypt hashes contain `$`. In a docker-compose file, write each `$` as `$$`.

**Frontend** (port 80) is nginx serving the app and proxying `/api` to `BACKEND_URL` (default `http://backend:3000`). Only expose the frontend; put https in front of it.

On an iPhone, open the site in Safari and choose _Share → Add to Home Screen_ to get the app full screen.
