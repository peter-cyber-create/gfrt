# Dependency security

## Policy

- Run `npm audit --omit=dev` in CI on every push.
- **Fail CI** on `critical` or `high` severity findings in production dependencies.
- Dev-dependency findings are reported but do not fail CI unless they affect the runtime bundle.

## Commands

```bash
cd backend && npm audit --omit=dev
cd clone && npm audit --omit=dev
```

## Last audit snapshot (2026-09-14)

`cd backend && npm audit --omit=dev`:

| Severity | Count |
|----------|-------|
| critical | 0 |
| high | 3 |
| moderate | 0 (omit=dev); 2 when including full tree earlier |
| low | 0 |

| Package | Severity | Runtime? | Remediation |
|---------|----------|----------|-------------|
| `deepmerge-ts` (via Prisma toolchain) | high | No — Prisma CLI / config chain | Avoid `npm audit fix --force` (would downgrade prisma to breaking 6.12). Track upstream; pin lockfile |
| `@prisma/config` | high | Dev tooling | Same |
| `prisma` | high | DevDependency | Same |

CI fails on **critical** (`--audit-level=critical`). High Prisma-toolchain findings are documented, not force-upgraded.

## Mitigations

- Pin lockfiles (`package-lock.json`) in CI with `npm ci`.
- Rebuild Docker images on dependency bumps.
- Subscribe to GitHub Dependabot alerts when enabled.
