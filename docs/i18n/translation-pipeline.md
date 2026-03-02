# DeepL Translation Pipeline

## Overview

The translation pipeline uses DeepL's API to generate locale files from English source messages, with safeguards for canonical STS terminology and placeholder integrity.

## Usage

```bash
# Translate to German
DEEPL_API_KEY=your-key pnpm i18n:translate --locale de

# Translate specific namespace only
DEEPL_API_KEY=your-key pnpm i18n:translate --locale fr --namespace common

# Preview without API calls
pnpm i18n:translate --locale de --dry-run

# Set formality level
DEEPL_API_KEY=your-key pnpm i18n:translate --locale de --formality prefer_more
```

## Pipeline Steps

1. **Load English messages** from `src/lib/i18n/messages/en.ts`.
2. **Load canonical term pairs** from `src/lib/i18n/canonical/en.json` and `<locale>.json`.
3. **Protect placeholders**: `{count}` tokens are wrapped in XML tags that DeepL preserves.
4. **Translate via DeepL API** in batches of 50 texts per request.
5. **Restore placeholders**: XML tags are converted back to `{placeholder}` syntax.
6. **Apply canonical corrections**: Replace any generic translations of game terms with official STS terms.
7. **Write output**: Generate `messages/<locale>.ts` and `meta/<locale>.json` with audit trail.

## Safeguards

### Placeholder Protection

Before sending to DeepL, placeholders are wrapped:
- Input: `"Found {count} items"`
- Protected: `"Found <x id=\"0\">{count}</x> items"`
- After DeepL: `"<x id=\"0\">{count}</x> Elemente gefunden"`
- Restored: `"{count} Elemente gefunden"`

### Canonical Term Protection

After translation, the pipeline scans for English game terms that should have been translated using the canonical glossary and corrects them.

### Formality

DeepL supports formality levels for some languages. The default is `prefer_more` (formal). Supported languages: DE, FR, IT, ES, NL, PL, PT-BR, RU, JA.

## Provenance & Audit Trail

Each generated locale gets metadata in `meta/<locale>.json`:

```json
{
  "locale": "de",
  "status": "ai_unverified",
  "human_review_coverage": 0,
  "generated_by": "deepl-api (formality=prefer_more)",
  "generated_at": "2026-02-16T...",
  "history": [
    { "action": "created", "status": "ai_unverified", "by": "deepl-api", "at": "...", "notes": "..." }
  ]
}
```

## CI Workflow

The `translate.yml` GitHub Actions workflow provides a `workflow_dispatch` interface for generating translations. It:
- Only runs on the base repository (never forks)
- Requires `DEEPL_API_KEY` in repository secrets
- Runs validation after generation
- Uploads a diff artifact for review

## After Generation

1. Register the locale in `src/lib/i18n/index.ts` (`SUPPORTED_LOCALES` and `Locale` type).
2. Add a dynamic import loader in `loadLocale()`.
3. Run `pnpm check` and `pnpm build` to verify.
4. Submit a PR for review.
