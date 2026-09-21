---
name: create-skill
description: "Creates new agent skills following project conventions — kebab-case folder names, 100-line SKILL.md limit, third-person descriptions with trigger keywords, and .artifacts/ awareness for output-producing skills. Use when creating a new skill, writing a skill, or asked \"add a skill for X\", \"make a skill that...\", \"new skill for X\"."
---

# Create Skill

## Process

1. **Gather requirements:**
   - What task or domain does the skill cover?
   - What are the specific trigger scenarios (when should the agent use it)?
   - Does it produce output files? If so, where do they go?
   - Does it need reference files or examples beyond the main SKILL.md?

2. **Design:**
   - Skill folder name: **kebab-case** (e.g. `git-commit/`, `ui-design-web/`, `prd-workflow/`) — matches the convention of all installed skills
   - Storage: always `~/.agents/skills/<skill-name>/` — never `~/.cursor/skills-cursor/`
   - Description: third-person, max 1024 chars, specific triggers

3. **Draft:** write SKILL.md + supporting files

4. **Review with user:** confirm coverage, missing cases, trigger accuracy

5. **Finalize**

## SKILL.md Constraints

- **100-line hard limit** for the SKILL.md body
- When content exceeds 100 lines: split into `REFERENCE.md`, `EXAMPLES.md`, or `references/` folder
- Keep references one level deep — link from SKILL.md directly to the file

## Description Format

```yaml
description: "[What it does in one sentence]. Use when [specific triggers — keywords, contexts, file types, user phrases]."
```

- Always **double-quote** the description. Unquoted `: ` (e.g. `mandates: arrow`) is a YAML nested-mapping error and the skills CLI **skips** the skill.
- Third person (not "I can help you...")
- First sentence: what the skill does
- Second sentence: "Use when [triggers]"
- Include specific keywords the agent should recognise

**Good:**
```
Generates Excalidraw diagram files from natural language. Use when creating a diagram, flowchart, architecture diagram, or when the user mentions "visualize", "draw", or "show the relationship".
```

**Bad:**
```
Helps with documents.
```

## For Output-Producing Skills

If the skill creates files, explicitly state in SKILL.md:
- Output path format (including `.artifacts/` placement if applicable)
- Filename convention (ALL_CAPS_SNAKE_CASE for `.artifacts/` files)

## File Structure

```
~/.agents/skills/<skill-name>/
├── SKILL.md              ← required, under 100 lines
├── REFERENCE.md          ← detailed docs when SKILL.md would exceed 100 lines
├── EXAMPLES.md           ← usage examples (optional)
└── references/           ← templates, schemas, type references (optional)
    └── someSchema.md
```

## When to Add Supporting Files

| Situation | Add |
|---|---|
| SKILL.md body > 100 lines | `REFERENCE.md` |
| Distinct domain content (e.g. schema + patterns) | Separate files in `references/` |
| Concrete usage examples help | `EXAMPLES.md` |
| Deterministic operations benefit from scripts | `scripts/` |
