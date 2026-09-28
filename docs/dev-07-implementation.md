# DEV-07 implementation notes

DEV-07 reuses `application_profiles` for staff identity and keeps Supabase Auth authoritative for login email. Routine staff administration is limited to authenticated active ADMIN sessions. ADMIN role and ADMIN status changes remain available only through the interactive `pnpm staff:authority` server command, which requires an existing active Admin, hidden current-password reauthentication, a target revision, and a reason.

The Auth Admin service credential is server-only and locally generated into ignored `.env.local`. It is never sent to the browser or logged. Invitation links use an explicit scanner-safe confirmation step before password setup.

Citizen account disabling remains an unplaced MVP administration requirement and must be explicitly assigned to a later approved slice/release task before final QA/release.

Owner review corrections:
- Staff list/detail show invitation pending until verification and password setup finish. The provider activation marker is presentation-only; ACTIVE/DISABLED application authorization remains unchanged.
- Invitation correction resolves the email from the protected target projection, rejects occupied addresses and verified/used accounts explicitly, and reissues an invitation for the same provider identity (not a signup email).
- Administrative audit action/operation labels are localized in Arabic, French and English. Stored audit evidence is unchanged; user-written reasons remain in their original language.
