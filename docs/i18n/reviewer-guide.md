# Translation Reviewer Guide

This document describes how to review and verify AI-generated translations for the STS Stat Viewer.

## Overview

All non-English locales start as `ai_unverified` (generated via DeepL). A locale can only be promoted to `human_verified` after a complete review by a native speaker.

## Review Checklist

For each translation key, verify:

1. **Accuracy**: Does the translation convey the same meaning as the English source?
2. **Tone**: Is the tone appropriate (formal/informal) and consistent across the locale?
3. **Placeholders**: Are all `{placeholder}` tokens present and in the correct position?
4. **Canonical terms**: Do Slay the Spire game terms (cards, relics, characters) use the official localized names from the game?
5. **Context**: Does the translation make sense in the UI context? (Button labels should be short, error messages should be clear, etc.)
6. **Grammar**: Is the grammar correct and natural-sounding?
7. **Length**: Does the translation fit reasonable UI constraints? (No excessive truncation or overflow expected.)

## Review Process

### 1. Setup

```bash
# Ensure canonical terms are extracted (requires STS installation)
pnpm i18n:extract

# Run validation to see current state
pnpm i18n:validate
```

### 2. Review the locale file

Open `src/lib/i18n/messages/<locale>.ts` and review each key:

- Compare against `src/lib/i18n/messages/en.ts` (English source)
- Check canonical terms against `src/lib/i18n/canonical/<locale>.json`
- Note any issues in the metadata file

### 3. Fix issues

Edit the locale `.ts` file directly to correct translations. Keep the same key structure.

### 4. Update metadata

Once **all** keys have been reviewed, update `src/lib/i18n/meta/<locale>.json`:

```json
{
  "locale": "<locale>",
  "status": "human_verified",
  "human_review_coverage": 100,
  "reviewed_by": "Your Name / GitHub username",
  "reviewed_at": "2026-MM-DDTHH:MM:SSZ",
  "generated_by": "deepl-api (formality=prefer_more)",
  "generated_at": "...",
  "notes": "Fully reviewed by native speaker.",
  "history": [
    // ... existing entries ...
    {
      "action": "verified",
      "status": "human_verified",
      "by": "Your Name",
      "at": "2026-MM-DDTHH:MM:SSZ",
      "notes": "Full review completed."
    }
  ]
}
```

### 5. Validate and submit

```bash
# Verify the changes pass validation
pnpm i18n:validate

# Run the build to check for errors
pnpm build

# Submit a PR with the reviewed translations
```

## CI Enforcement

The CI pipeline enforces:

- `human_verified` status requires `human_review_coverage: 100`
- `human_verified` status requires `reviewed_by` and `reviewed_at` fields
- Canonical term lock: game_terms must match the canonical glossary
- All English keys must be present in every locale file

## Reporting Issues

If you find a translation issue after release, use the [Translation Correction issue template](../../.github/ISSUE_TEMPLATE/translation-correction.yml) to report it.
