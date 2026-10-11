# JT Immigration — client portal

Irish citizenship (naturalisation) case portal. Staff add clients → each client gets a personal link (no password) to answer a
Form 8–style questionnaire and upload documents → staff review each document, flag issues, track the case,
and export a lodging pack (named ZIP + Form 8 transcription sheet).

- **Next.js 16** (App Router) on Vercel
- **Vercel Blob (private store, Dublin)** is both the database and file store:
  `applications/<id>.json`, `users/<id>.json`, `users-by-email/<hash>.json`, `staff-index.json`, `uploads/<id>/<docKey>/<file>`.
  Writes use ETag optimistic concurrency, so staff and clients can work on a case at the same time.
- Document checklist: `lib/citizenship.ts` · Questionnaire (mirrors ISD Form 8 numbering): `lib/questionnaire.ts` · Stages: `lib/status.ts`

## First-time setup (production)

1. Deploy. The existing `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD` env vars are all that's required.
2. Go to `/admin` and enter `ADMIN_PASSWORD`. The first time, this creates the single staff account (named “JT Immigration”).
   Change its password at **Account** (top-right). Sign-in is **password only**, and there is exactly one staff account.
   `ADMIN_PASSWORD` keeps working as a backup key, so keep it long and private.
3. Optional but recommended — email (without it, the portal gives staff links to copy into WhatsApp/email):
   - `RESEND_API_KEY` — from resend.com, after verifying the sending domain (e.g. `jtimmigration.ie`)
   - `EMAIL_FROM` — e.g. `JT Immigration <noreply@jtimmigration.ie>`
   - `EMAIL_REPLY_TO` — the office inbox (clients' replies go here)
   - `STAFF_NOTIFY_EMAIL` — where "client submitted / sent a message" alerts go (defaults to the staff account's email, if it has one)
4. Optional: `AUTH_SECRET` (32+ random chars) to sign sessions; otherwise it's derived from the Blob token.
   `APP_URL` (e.g. `https://portal.jtimmigration.ie`) if links in emails should use a custom domain.
5. Vercel Hobby is non-commercial only — a business should be on Pro. Add a Vercel WAF rate-limit rule on POST `/login` — sign-in is password-only, with no per-account lockout.

## How it works day to day

| Who | Where | What |
| --- | --- | --- |
| Staff | `/admin` | Case list. "Needs attention" = new client activity or ready for review. Deadlines panel (ISD 28-day info requests, vetting, IRP expiry, ceremony). |
| Staff | `/admin/invite` | Add a client (name; email optional) + case; copy/WhatsApp their personal link or email it. |
| Staff | `/admin/cases/<id>` | Review each document (approve / flag with preset reason + note), "Send issues to client", stage, messages, case details (ISD number, dates, fees), internal notes, eligibility checks (70/100-day rule, permission gaps), client link (copy / email / “New link” to revoke the old one), delete (GDPR). |
| Staff | `/admin/cases/<id>/sheet` | Answers in ISD Form 8 order with copy buttons + lodging checklist. Print/save as PDF. |
| Staff | `/admin/cases/<id>/download` | ZIP of every document, foldered and named "Client Name - Document.pdf". |
| Client | `/application/<id>` | To-do list, document checklist with review status and staff notes, messages, "send for review". |
| Client | `/application/<id>/details` | Questionnaire, saved per section; counts days abroad automatically. |

**Why there's no "auto-submit to ISD":** the ISD portal has no API or agent channel; the applicant must
personally tick the declaration (false statements are an offence under s.29A of the 1956 Act), pay the €175 fee
with their own card, and own the account that receives vetting/ceremony emails. The transcription sheet + ZIP make
lodging a ~20–40 minute job done with the client present.

Clients sign in only via their personal link `/c/<token>` (HMAC-signed, no expiry). “New link” on the case page bumps the user's `linkVersion`, which kills the old link and signs out any device using it. There is no public sign-up. Staff sign in with a password only at `/login`.

Old applications started before accounts (UUID links) still work: opening the link asks the client to create an account and attaches the case.

## Local dev

```bash
vercel env pull .env.local   # BLOB_READ_WRITE_TOKEN, ADMIN_PASSWORD
npm run dev
```

`.env.development.local` sets `STORE_PREFIX=dev/` (and a local-only setup password) so local testing never
touches live data — everything you create locally lives under `dev/` in the Blob store.

## Making changes with Claude (no coding needed)

The repo is set up for Claude Code on the web (claude.ai/code or the Claude app's Code tab). Ask for a change in plain
English; Claude pushes a branch and replies with its Vercel preview link
(`jt-immigration-git-<branch>-ajm94s-projects.vercel.app`, test data under `preview/`, never real clients). Reply
"make it live" and Claude runs the checks and merges to `main`; the live site redeploys in ~2 minutes. "Undo that
change" reverts it the same way. Nobody needs to open GitHub.

- `CLAUDE.md` tells Claude how to work with a non-technical requester, when it may publish, and what it must never touch.
- `.claude/settings.json` blocks `vercel` commands, force-pushes and reading `.env` files, and installs packages at the start of each cloud session (no setup script needed).
- `.github/workflows/checks.yml` runs type check, lint and a full build on every push to `main` (and on any pull request).
- Vercel needs, for **Preview** only: `STORE_PREFIX=preview/` and an `ADMIN_PASSWORD`; and Deployment Protection off for
  previews so the link opens without a Vercel login.
