# MediaFlow Studio — Agent Rules & Engineering Guidelines

## MANDATORY RULE: Mandatory Git Commit with Proper Message After Every Change

The AI assistant must strictly adhere to the following workflow for all tasks:

1. **Commit Policy**:
   - Immediately after completing code or configuration edits and verifying them with build checks, create a Git commit.
   - Do NOT ask the user for permission to commit; automatically stage and commit all relevant changes.
   - Never leave uncommitted changes in the repository at the end of a session or turn.

2. **Commit Message Standard**:
   - Format: `<type>(<scope>): <summary>`
   - Detailed message body:
     * Bullet points detailing what was changed
     * Rationale behind the modifications
     * Verification performed
