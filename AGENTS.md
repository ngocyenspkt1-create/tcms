# TCMS - Codex Working Instructions

## 1. Project

This repository is TCMS - Technical Contract Management System.

It is an existing project under active development.

Do not rebuild the project from scratch unless explicitly requested.

Preserve existing working UI, business logic, and project structure whenever possible.

---

## 2. User Skill Level

The project owner is not a professional software developer.

When reporting work:

- Use simple Vietnamese.
- Avoid unnecessary software jargon.
- Explain errors in plain language.
- Give clear verification steps.
- Clearly state what was changed.
- Clearly state what the user needs to do next.

Do not assume the user understands Git, databases, APIs, authentication, deployment, or software architecture.

---

## 3. Context Efficiency

Minimize unnecessary context usage.

For every task:

- Inspect only files directly related to the task.
- Do not scan the entire repository unless necessary.
- Do not repeatedly read files already understood in the current task.
- Follow direct imports/dependencies only when required.
- Prefer targeted searches over broad repository exploration.
- Keep investigation proportional to the task.

For a small UI or TypeScript change, do not perform a full architecture review.

---

## 4. Task Scope

Treat each request as one bounded task.

Do not automatically continue into the next feature or phase.

Before editing:

1. Identify the requested outcome.
2. Identify the minimum files involved.
3. Give a short implementation plan when useful.
4. Make the smallest safe change that solves the task.

After completing the task, stop.

Do not add unrelated improvements unless they are required for correctness or security.

---

## 5. Existing Code

Before modifying a file:

- Read the relevant existing implementation.
- Preserve working behavior not related to the requested change.
- Avoid unnecessary refactoring.
- Avoid renaming files, fields, components, or APIs without a clear reason.
- Avoid large rewrites when a small modification is sufficient.

If changing a shared TypeScript interface or database model, first identify its direct usages and update affected code consistently.

---

## 6. Dependencies

Do not install a new npm package unless it provides a clear benefit.

Before adding a dependency:

1. Check whether the existing stack can solve the problem.
2. Prefer existing project dependencies.
3. Add a new package only when justified.

Do not upgrade major framework/package versions as part of an unrelated task.

---

## 7. Verification

Use verification proportional to the change.

For small changes:

- Prefer targeted TypeScript/lint checks.

For larger changes:

- Run relevant type checking.
- Run relevant linting.
- Run tests if available and relevant.

Run a full production build when appropriate, especially after structural changes or before a milestone.

Do not repeatedly run expensive full-project checks after every trivial CSS/text change.

Never hide verification failures.

---

## 8. Database and Data

TCMS is being developed locally first.

Current target architecture:

Browser / UI
→ Next.js server/API
→ Business logic/service
→ Repository/data access
→ PostgreSQL

Important rules:

- PostgreSQL is the target persistent database.
- Do not access PostgreSQL directly from browser code.
- Do not hard-code database credentials.
- Use environment variables.
- Do not commit secrets.
- Do not use localStorage for important shared business data.
- localStorage may only be used for non-critical UI preferences when appropriate.

The system should be designed so it can later move from local DEV to a production server without rewriting business logic.

---

## 9. Authentication and Authorization

Production SSO/OIDC is not available yet.

Development must not be blocked by missing production SSO.

A development authentication mechanism may be used locally, but:

- It must be clearly development-only.
- It must never silently work in production.
- Authorization must be enforced server-side.
- The browser must not be trusted to declare its own permissions.

Prepare architecture so production OIDC/SSO can replace development authentication later.

---

## 10. Security

Never:

- Hard-code passwords.
- Hard-code database credentials.
- Hard-code client secrets.
- Commit .env secrets.
- Expose DATABASE_URL to browser code.
- Put secrets in NEXT_PUBLIC_* variables.
- Trust client-side role declarations for authorization.
- Construct unsafe SQL from raw user input.

If credentials are required, tell the user which environment variable must be configured.

Do not ask the user to paste sensitive credentials into chat.

---

## 11. Git Safety

Before substantial changes, check the working tree when useful.

Do not:

- Delete unrelated user work.
- Reset the repository destructively.
- Force push.
- Rewrite Git history.
- Delete branches.
- Discard uncommitted changes.

unless explicitly requested and the consequences are explained.

Keep commits logically scoped when commits are requested.

Never commit:

- node_modules
- .next
- .env files containing secrets
- temporary files
- database dumps containing sensitive information

---

## 12. TCMS Domain

Main TCMS domains include:

- Departments
- Users / Personnel
- Contractors
- Contracts
- Contract Supervisors
- Contract Items
- Milestones
- Inspections
- Technical Issues / Findings
- Acceptance
- Documents
- Payment / Settlement references
- Audit Logs

A Contract can contain multiple Contract Items.

Contract Items are an important unit for technical monitoring, progress tracking, inspection, issues, and acceptance.

Preserve this domain direction when implementing future features.

---

## 13. UI Principles

TCMS is an engineering management application.

Prioritize:

- Clear information hierarchy
- Compact but readable tables
- Fast scanning
- Practical filtering
- Visible status and warning indicators
- Consistent spacing
- Consistent borders
- Efficient use of screen width
- Drill-down for detailed information instead of overcrowding summary tables

Do not redesign established UI patterns unless requested.

---

## 14. Communication After Coding

After completing a coding task, report in simple Vietnamese using this structure:

### Đã làm
Briefly explain what changed.

### File đã thay đổi
List the files changed.

### Kiểm tra
State what verification was performed and whether it passed.

### Anh cần làm
Give the user only the necessary next steps.

### Còn lại
Mention remaining issues only if relevant.

Keep this report concise.

---

## 15. Important Working Principle

Optimize for:

1. Correctness
2. Data integrity
3. Security
4. Maintainability
5. Simplicity
6. Context efficiency

Avoid unnecessary architectural complexity.

The current priority is to complete a reliable local DEV version of TCMS first, while keeping the architecture ready for future production deployment.