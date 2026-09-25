import 'server-only';
/** Fixed event names only: never attach identity, credentials, proof, or cookie data. */
export function authEvent(event:'staff_login_denied'|'staff_disabled'|'staff_recovery_denied'|'staff_session_ended'|'role_denied'){console.info(`[auth] ${event}`);}
