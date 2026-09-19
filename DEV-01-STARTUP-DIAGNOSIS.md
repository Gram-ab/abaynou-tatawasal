# DEV-01 local startup diagnosis — 2026-09-19

Historical diagnosis. RESOLVED on 2026-09-19 after the owner upgraded/recreated Podman 6.1.2. Windows loopback connectivity, Supabase startup, migrations and clean reconstruction subsequently passed. See DEV-01-VERIFICATION.md. The original diagnostic evidence below is retained.

## Diagnosis

Podman 6.0.2 Windows/WSL published-port forwarding regression. PostgreSQL becomes healthy inside its container, but Windows loopback does not forward the published database port. This is failure category E (host connectivity), consistent with upstream Podman issue 29377.

- Supabase CLI: project dependency 2.117.0.
- Podman client and server: 6.0.2. WSL: 2.7.8.0.
- Machine: podman-machine-default, running WSL, rootful default connection, user-mode networking false.
- Project: Abaynou_Tatawasal; working directory is the existing project root.
- Failing command: `pnpm exec supabase start --debug`, with installed Podman on process PATH and `DOCKER_HOST=npipe:////./pipe/podman-machine-default`.
- Relevant complete error: `LegacyDbConnectError: failed to connect to postgres: failed to connect to host=127.0.0.1 user=postgres database=postgres: dial error (connect ECONNREFUSED 127.0.0.1:54322)`.
- No existing listener, stale container, or Windows excluded range covers 54322.
- Container mapping: `0.0.0.0:54322 -> 5432/tcp`.
- Container health reaches healthy; pg_isready reports accepting connections; PostgreSQL logs report ready to accept connections. OOMKilled false.
- During the same startup, Windows TCP probe to `127.0.0.1:54322` failed while the dynamically discovered local WSL machine IP on port 54322 succeeded. The machine IP is not a stable application configuration and was not saved as one.
- Startup fails before application migrations execute. The CLI then removes its failed-start container/network/volume automatically. No unrelated resource was removed manually.

## Resolution and owner action

No environment modification applied. No ports changed. Current project ports remain API 54321, DB 54322, shadow DB 54320, Studio 54323, local SMTP UI 54324, analytics 54327; pooler 54329 is disabled.

Owner action: update both the Windows Podman client and machine engine to a supported version containing the 6.1.0 WSL forwarding fix, and ensure the existing WSL machine has the documented `force_port_listen` configuration enabled. Updating the client alone does not establish that the existing machine engine/configuration has been fixed. Preserve existing machine data; do not delete/recreate the machine without reviewing its contents.

Podman 6.1.0 release notes state that force_port_listen is required for WSL Windows-host forwarding and is automatically enabled for newly created WSL machines. Existing machine configuration needs verification after upgrade.

This is reserved for the owner under the supplied stop conditions concerning Podman Desktop / WSL / system environment changes. No firewall, Windows excluded range, WSL setting, Podman machine setting, or installed engine was modified.

Sources:
- https://github.com/podman-container-tools/podman/issues/29377
- https://github.com/podman-container-tools/podman/releases/tag/v6.1.0

## Verification and remaining work

- Local Supabase: not started successfully; final status reports no database container.
- Local reset/reconstruction: not run because the stack is not healthy/reachable on its configured endpoint.
- Migration 1: drafted, unverified. No schema changes were made during diagnosis.
- Development fixtures: not yet implemented/run.
- DEV-01 implementation: not resumed beyond diagnosis, as instructed until database health is restored.
- Remaining: finish seven-entity migrations and security verification, fixtures, safe projections, nine public pages in ar/fr/en, RTL/LTR/responsive/accessibility checks, integration/security tests, production build, clean reconstruction, and owner review.
- Earlier unit-test result: 14 passing; not rerun during this environment-only diagnosis.
- Frozen-file hash check: all 32 documents/design files match the saved baseline (0 changes).
- No hosted Supabase project created or linked; no project-ref marker; no remote push; no Git remote configured.
- DEV-02 not started. Architecture unchanged.

Raw diagnostic logs are ignored under `.local/`; they are not part of committed documentation and should not be published without review.
