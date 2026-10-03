# CLAUDE.md

This file is the entry point Claude Code reads at the start of every session in this repository. It stays short on purpose. Everything else lives in `.claude/` and is loaded only when relevant to the task at hand.

## How this repo's knowledge is organized

```
.claude/
  docs/          Documentation conventions (writing, markdown, API reference)
  engineering/   Technical standards (architecture, language, framework, testing, performance)
  workflow/      Git, PR, release, and code review process
  product/       Domain glossary, business rules, terminology
  examples/      Reference snippets Claude should mirror when generating new code
```

When a task touches one of these areas, read the corresponding file(s) before acting. Don't guess conventions that are already written down.

## Stack at a glance

- **Frontend:** see `.claude/engineering/frontend.md`
- **Backend:** see `.claude/engineering/backend.md`
- **Shared engineering standards:** `.claude/engineering/architecture.md`, `coding-standards.md`, `typescript.md`, `testing.md`, `performance.md`

## Core rules

- Never invent a convention if one is already documented under `.claude/`. Read first, then act.
- When a task is ambiguous between frontend and backend concerns, check both `frontend.md` and `backend.md` before deciding where code belongs.
- Follow the workflow docs (`git.md`, `pull-requests.md`, `code-review.md`) for anything touching version control.
- Use `product/glossary.md` and `product/terminology.md` to keep naming consistent with how the business actually talks about the domain.
- Prefer editing existing patterns in `examples/` over introducing a new pattern.

## Source code

All application code lives under `/src`. See `engineering/architecture.md` for the folder structure inside it.
