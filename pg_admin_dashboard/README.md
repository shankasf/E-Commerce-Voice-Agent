# CallSphere PostgreSQL Admin Dashboard

Secure Node.js dashboard for managing PostgreSQL databases and roles. Designed for k3s with a bind-mounted audit/session volume and ingress at `db.callsphere.tech`.

## Admin credentials

- Admin ID: `callsphere_admin`
- Admin password: `CallSphere@DB2025!`

Rotate these immediately by editing `/home/ubuntu/apps/pg_admin_dashboard/.env` or the Kubernetes secret.

## Local run

```bash
cd /home/ubuntu/apps/pg_admin_dashboard
npm install
npm start
```

Open `http://localhost:3000`.

## Environment

See `.env.example` for all settings. Required PostgreSQL connectivity uses standard `PG*` variables.

## k3s deployment

1) Build and push the image:

```bash
docker build -t callsphere/pg-admin-dashboard:latest .
docker push callsphere/pg-admin-dashboard:latest
```

2) Update secrets:

- Edit `k3s/secret.yaml` to set `ADMIN_ID`, `ADMIN_PASSWORD`, and Postgres connection values.

3) Apply manifests:

```bash
kubectl apply -f k3s/secret.yaml
kubectl apply -f k3s/deployment.yaml
kubectl apply -f k3s/service.yaml
kubectl apply -f k3s/ingress.yaml
```

The dashboard will bind-mount audit logs and session files to `/var/lib/pg-admin-dashboard` on the node.

## Security notes

- CSRF protection, session cookies, rate limiting, and strict CSP headers are enabled.
- Database drops and superuser grants are disabled by default (`ALLOW_DB_DROP=false`, `ALLOW_SUPERUSER_GRANT=false`).
- Audit events are written to `/data/audit.log`.
