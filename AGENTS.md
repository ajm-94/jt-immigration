

# Working on this app

This is the client portal for JT Immigration, an Irish citizenship consultancy. The person asking for changes is
usually a family member of the consultant who runs it, not a programmer. They ask in plain English, check the result
on a preview link, and make it live by merging the pull request on GitHub. They don't read code.

## How to talk to them

- Plain English, short sentences, no jargon or code in replies unless asked. Say "the page clients see" or
  "the case page", not file names.
- Before editing, say in one or two sentences what you will change and where it will show (which page, and whether
  clients or only staff will see it). If the request is unclear, ask one simple question first.
- After a change, describe what changed in plain words, then give the finishing steps below.

## Where things live

| What | File |
| --- | --- |
| Document checklists for each application type (labels, hints, which are optional) | `lib/citizenship.ts` |
| Client questions (Form 8 questionnaire) | `lib/questionnaire.ts` |
| Page the client sees | `app/application/[id]/page.tsx` |
| Staff case list / a client's case page | `app/admin/page.tsx`, `app/admin/cases/[id]/page.tsx` |
| Add client page | `app/admin/invite/page.tsx` |
| Email wording | `lib/email.ts` |
| Homepage | `app/page.tsx` |

Document requirements are legal requirements. Don't invent or drop one on your own judgement: if asked for a
change, make it, and if it conflicts with Immigration Service guidance (irishimmigration.ie), say so plainly first.

## Checking your work

Run `npm ci` if `node_modules` is missing, then `npx next typegen && npx tsc --noEmit` and `npm run lint`, and fix
anything they report. GitHub runs these plus a full build on every pull request; a red cross on the pull request means
it must not be merged.

## How a change goes live (finishing steps: give these every time)

1. Make the change on a new branch and open a pull request with a short, plain-English title (in ChatGPT Codex: press
   **Create PR** when the task is done).
2. On the pull request page on GitHub, after 2–3 minutes a **Vercel** comment appears with a **Preview** link. Open it
   and check the change. Sign in at `/admin` with the usual password to look around. For now the preview shares the
   live site's clients, so look but don't add or delete clients there.
3. If it looks right and the checks show a green tick, press **Merge pull request**, then **Confirm merge**. The live
   site updates within about 2 minutes.

If it isn't right, describe what to change and update the same pull request.

## Undoing a change

Easiest: on GitHub, open the merged pull request and press **Revert**, then **Create pull request**, then
**Merge pull request**. That puts the site back how it was before that change. If asked to do it instead, revert the
merge commit (`git revert -m 1 <merge sha>`) on a new branch and finish with the steps above.

## Never

- Deploy (any `vercel` command), or change environment variables, passwords or API keys.
- Read, change or delete client data or uploaded documents (the Vercel Blob store), or run scripts against it.
- Weaken sign-in or access checks: `lib/session.ts`, `lib/crypto.ts`, `app/c/[token]/route.ts`, `app/api/upload/route.ts`,
  `app/api/file/route.ts`, `app/_actions/auth.ts`.
- Add a new package without saying why in plain English.

If a request needs any of these (sign-in, security, client data, payments, deleting things), stop and say in one
sentence that it needs the site's developer.
