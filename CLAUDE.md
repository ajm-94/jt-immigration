@AGENTS.md

# Working on this app

This is the client portal for JT Immigration, an Irish citizenship consultancy. The person asking for changes is
usually the consultant who runs it, not a programmer. She asks in plain English, checks the result on a preview
link, and tells you when to make it live. She does not read code or use GitHub.

## How to talk to her

- Plain English, short sentences, no jargon or code in replies unless she asks. Say "the page clients see" or
  "your case page", not file names.
- Before editing, say in one or two sentences what you will change and where it will show (which page, and whether
  clients or only she will see it). If the request is unclear, ask one simple question first.
- After a change, describe what changed in her words, then give her the preview link (see below).

## Where things live

| What | File |
| --- | --- |
| Document checklists for each application type (labels, hints, which are optional) | `lib/citizenship.ts` |
| Client questions (Form 8 questionnaire) | `lib/questionnaire.ts` |
| Page the client sees | `app/application/[id]/page.tsx` |
| Her case list / a client's case page | `app/admin/page.tsx`, `app/admin/cases/[id]/page.tsx` |
| Add client page | `app/admin/invite/page.tsx` |
| Email wording | `lib/email.ts` |
| Homepage | `app/page.tsx` |

Document requirements are legal requirements. Don't invent or drop one on your own judgement: if she asks for a
change, make it, and if it conflicts with Immigration Service guidance (irishimmigration.ie), say so plainly first.

## Checking your work

Run `npx next typegen && npx tsc --noEmit` and `npm run lint`, and fix anything they report. Also run `npm run build`
if the network allows (it downloads web fonts; if only the font download fails, carry on). GitHub runs all three
again on every update to `main`.

## How a change goes live (she never uses GitHub herself)

1. Make the change on a new branch with a short lowercase name, e.g. `payslip-docs` (letters, numbers and dashes,
   under 20 characters). Commit and `git push -u origin <branch>`.
2. Vercel builds a preview of every pushed branch automatically, using test data, never real clients. Give her the
   link: `https://jt-immigration-git-<branch>-ajm94s-projects.vercel.app`. Say it may take 2–3 minutes to appear,
   that she should check the change there, and that it's safe to click around. To check client pages she can sign
   in at `/admin` on the preview and add a test client.
3. Wait for her to clearly approve that preview ("looks good", "make it live", "yes"). Never publish without that.
4. Publish: run the checks above, then
   `git fetch origin main && git checkout main && git merge --ff-only origin/main && git merge --no-ff <branch> -m "<plain description>" && git push origin main`.
   If a check fails or the merge conflicts, don't push; explain in one sentence and fix it on the branch first.
5. Tell her the live site will update within about 2 minutes.

Several requests can share one branch and preview if she's making a batch of changes; publish once she approves the lot.

## Undoing a change

If she says something broke or wants a change undone: list the recent changes from `git log --oneline main` in plain
words and confirm which one. Then on `main`, `git revert -m 1 <merge sha>` (or `git revert <sha>` for a plain commit),
run the checks, and `git push origin main`. Explain that this puts the site back how it was before that change. If the
site is down and you can't fix it, tell her to contact the site's developer.

## Never

- Deploy (any `vercel` command), or change environment variables, passwords or API keys.
- Read, change or delete client data or uploaded documents (the Vercel Blob store), or run scripts against it.
- Weaken sign-in or access checks: `lib/session.ts`, `lib/crypto.ts`, `app/c/[token]/route.ts`, `app/api/upload/route.ts`,
  `app/api/file/route.ts`, `app/_actions/auth.ts`.
- Add a new package without saying why in plain English.

If a request needs any of these (sign-in, security, client data, payments, deleting things), stop and tell her it
needs the site's developer, in one sentence.
