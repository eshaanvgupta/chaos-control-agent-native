# Reproducible deployment

Local: `pnpm install --frozen-lockfile`, then `pnpm dev`. The official framework opens port 8080 (or the next available port). Runtime data lives under ignored `data/pglite`; do not run two processes against the same local PGlite directory.

Hosted production requires a persistent PostgreSQL URL and a stable `BETTER_AUTH_SECRET`. Agent-Native explicitly restricts local PGlite to local development. No usable hosted PostgreSQL credential was present in this session. A Sites frontend deployment alone would not satisfy the server/database contract; no disconnected shell has been published as a working app.

## Node / container

1. Obtain a PostgreSQL database using an existing authorized free account or self-hosted PostgreSQL. Check the provider's current free usage limits. This step is not provisioned by the repository.
2. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and public `BETTER_AUTH_URL` in the hosting environment. Generate the secret once; do not commit it.
3. Run `pnpm install --frozen-lockfile` and `pnpm migrate:production` as a release step against that database.
4. Run `pnpm build`, then `pnpm start`. Use the port printed by the framework and terminate HTTPS at the hosting ingress.
5. Verify the landing page, guest start, creation, plan approval/application and restart persistence using the test journeys.

The included Dockerfile builds the official framework server. Pass environment variables at runtime, never as image build arguments. Run the migration command from a release job using the same image before starting replicas. Production deployment commands depend on the authorized hosting account; neither a provider API token nor a production database was supplied here.

```sh
docker build -t chaos-control .
docker run --rm --env-file .env.production chaos-control pnpm migrate:production
docker run --env-file .env.production -p 8080:8080 chaos-control
```

For Cloudflare Workers, the official guide requires hosted PostgreSQL and release migrations as well; a filesystem PGlite database cannot persist in a Worker. See https://www.agent-native.com/docs/cloudflare/ and https://www.agent-native.com/docs/server-database/.

## GitHub publication

The authorized repository is `eshaanvgupta/chaos-control-agent-native`. The publication helper reads existing Git Credential Manager authorization in memory, verifies the account name, creates the repository only if missing, pushes without force, and compares local/remote commit IDs. It never writes the token. If authorization is unavailable:

```sh
gh auth login
gh repo create chaos-control-agent-native --public --source . --remote origin
git push -u origin main
git ls-remote origin refs/heads/main
```

Do not run `gh repo create` if the repository already exists; add the existing remote and push normally.
