@AGENTS.md

# Working on this app

This is the client portal for JT Immigration, an Irish citizenship consultancy. The person asking for changes is
usually the consultant who runs it, not a programmer. She asks in plain English and checks the result on a preview
link; she does not read code.

## How to talk to her

- Plain English, short sentences, no jargon or code in replies unless she asks. Say "the page clients see" or
  "your case page", not file names.
- Before editing, say in one or two sentences what you will change and where it will show (which page, and whether
  clients or only she will see it). If the request is unclear, ask one simple question first.
- After a change, describe what changed in her words, then give the finishing steps below.

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

Run `npx next typegen && npx tsc --noEmit` and `npm run lint` and fix anything they report before finishing. GitHub runs the same checks
plus a full build on every pull request; a red check means the change must not be merged.

## Finishing a change (tell her these steps every time)

1. Press **Create PR**.
2. Open the pull request on GitHub. After 2–3 minutes a **Vercel** comment appears with a **Preview** link: open it
   and check the change. The preview uses test data, not real clients, so it is safe to click around.
3. If it looks right and the checks show a green tick, press **Merge pull request**, then **Confirm merge**.
   The live site updates within about 2 minutes.

## Undoing a change

If she says something broke or wants a change undone: find the merge commit for that change, revert it on a new
branch (`git revert -m 1 <merge sha>`), and finish with the same steps. Explain that this puts the site back how it
was before that change.

## Never

- Deploy (any `vercel` command), or change environment variables, passwords or API keys.
- Read, change or delete client data or uploaded documents (the Vercel Blob store), or run scripts against it.
- Weaken sign-in or access checks: `lib/session.ts`, `lib/crypto.ts`, `app/c/[token]/route.ts`, `app/api/upload/route.ts`,
  `app/api/file/route.ts`, `app/_actions/auth.ts`.
- Add a new package without saying why in plain English.

If a request needs any of these (sign-in, security, client data, payments, deleting things), stop and tell her it
needs the site's developer, in one sentence.
