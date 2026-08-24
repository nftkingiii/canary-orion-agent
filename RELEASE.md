# Canary release and rollback

## Release gates

- No database migrations, required secrets, or traffic flags exist for this release.
- `ENABLE_EXTERNAL_AGENT_INTAKE=false` is the production kill switch; intake is enabled by default.
- `/healthz` returns the Railway commit SHA and the intake flag state.
- Static asset hashes must change with the intended build and the public agent workflow must be exercised after deploy.

## Rollback

1. For an active abuse incident, set `ENABLE_EXTERNAL_AGENT_INTAKE=false` in Railway and redeploy/restart.
2. For a code regression, revert the release commit on `main` and push the revert.
3. Confirm `/healthz` reports the rollback revision.
4. Exercise Harbor probation from a clean browser and confirm no new browser errors.

No server-side user data or database migration needs reversal. Browser-local run history remains on each user's device.
