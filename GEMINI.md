# MediaFlow Studio — AI Agent Engineering Directives & Rules

## MANDATORY RULE: Commit After Every Change with a Proper Message

Whenever you (the AI assistant) implement, modify, fix, refactor, or add code, configurations, or documentation in this repository:

1. **Verify Before Committing**:
   - Ensure the changes pass type checks and builds (`npm run build:vite`, `npm run build:electron`).
   - Confirm there are no broken imports or unhandled exceptions.

2. **Commit Immediately After Completing Changes**:
   - You MUST run `git add` for all modified and newly created project files relevant to the task (excluding unwanted scratch files or temporary logs).
   - You MUST execute `git commit` with a structured, professional, and descriptive commit message.
   - **NEVER** leave modified files uncommitted in the working tree when completing a task or responding to the user.

3. **Commit Message Format Requirements**:
   - Follow the **Conventional Commits** standard:
     `<type>(<scope>): <concise summary>`
   - Allowed types: `feat`, `fix`, `security`, `refactor`, `docs`, `chore`, `test`.
   - **Detailed Message Body**:
     Always include a multi-line body in the commit explaining:
     - **What was changed**: Explicit list of modified components/files.
     - **Why it was changed**: User requirement, bug description, or architectural necessity.
     - **Verification**: What builds or audits were run to prove correctness.

Example:
```bash
git commit -m "fix(security): sanitize all error handlers and IPC path disclosures

- Replaced raw e.message and stack traces with toUserErrorMessage across all pages
- Stripped absolute Windows/POSIX file paths from electron engine error throws
- Added automated audit script scripts/audit_errors.py
- Verified zero error leaks and successful build:vite + build:electron"
```
