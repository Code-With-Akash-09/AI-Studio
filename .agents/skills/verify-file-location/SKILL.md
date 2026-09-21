---
name: verify-file-location
description: Before editing or referencing any file, discover its current path with Glob or Grep, then Read that path immediately before StrReplace or Write. Never use remembered paths or stale buffer from a prior turn; user may move files or edit on disk between prompts. Use at the start of every task that touches an existing file, including skills under ~/.agents/skills/.
---

# Verify File Location Before Acting

Before editing, reading, or referencing any file:

1. **Search for it first** — use Glob or Grep to find the file by name
2. **Use the found path** — not the path from a previous session or conversation
3. **Never assume** a file is still where it was originally created

The user may have moved, renamed, or reorganised files since the last session. Always discover the current location.

## Re-read before write (stops silent reverts)

Right before `StrReplace` or overwriting with `Write`:

4. **Read** the file at the resolved path again — **from disk**, not from chat memory or an earlier tool result in the same session.
5. Build the patch from that **current** content only.

Between your last reply and the user’s next message, they may have edited the file. Applying a patch from an old snapshot **reverts their changes**. If the file changed since your last Read, discard assumptions and re-anchor hunks to the latest content.

## Required Behaviour

```
Task: "Update the UserCard component"

Wrong:
→ Open src/components/userCard.tsx  ← path remembered from last session

Correct:
1. Glob("**/userCard.tsx") or Glob("**/userCard*")
2. Found at: src/features/dashboard/_components/userCard.tsx
3. Edit at the found path
```

## Applies To

- Components, hooks, utilities, services, schemas
- Skill files in `~/.agents/skills/`
- Artifact files in `.artifacts/`
- Any file the AI created or referenced in a previous conversation
