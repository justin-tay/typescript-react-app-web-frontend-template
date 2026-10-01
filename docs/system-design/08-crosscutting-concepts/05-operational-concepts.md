# 8.5 Operational Concepts

<!-- arc42-generated -->

## Configuration Management

| Setting                                               | Where                                                | Notes                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `BACKEND_URL`                                         | Environment variable read by `vite.config.ts`        | Dev proxy target only. In production the same-origin routing is the host's job. |
| `APP_NAME`, `COPYRIGHT_HOLDER`, `FOOTER_LINKS`        | `src/config.ts`                                      | Placeholders to replace; a government service must link privacy and terms.      |
| `SESSION_IDLE_TIMEOUT_MS`, `SESSION_PROMPT_BEFORE_MS` | `src/config.ts`                                      | The first must equal the backend's session timeout; nothing checks it.          |
| Brand colours                                         | `--logo-primary`, `--logo-accent` in `src/index.css` | See the README, "Branding".                                                     |

Configuration is compiled in; there is no runtime configuration file.

## Logging and Monitoring

- The browser logs unexpected errors to the console only (`console.error` in the auth provider and the error boundary). Nothing is sent to a server.
- There is no error reporting, analytics or health check in the frontend.
- The backend's audit trail records business changes; this frontend only displays it.

## Scaling Strategy

The application is static files plus a stateless browser client. Scaling is the static host's concern. The load placed on the backend is bounded by paging (20 rows by default), debounced search and filter requests, and a quiet refetch of the review summary on navigation.
<!-- /arc42-generated -->
