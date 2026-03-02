# i18n Architecture

## Overview

The STS Stat Viewer uses a custom lightweight typed i18n runtime designed for Svelte 5.

## Key Design Decisions

1. **Custom runtime over library**: A ~160-line custom runtime (`src/lib/i18n/index.ts`) was chosen over heavier alternatives (typesafe-i18n, svelte-i18n) to maintain minimal bundle size and full TypeScript control.

2. **Compile-time key checking**: `TranslationKey` is a union type derived from the English message structure, preventing invalid keys at compile time.

3. **Lazy locale loading**: Non-English locale bundles are dynamically imported and code-split by Vite. English is always statically imported.

4. **Svelte store integration**: `t` and `tp` are Svelte derived stores, enabling reactive translations via `$t('key')` and `$tp('key', count)`.

## File Structure

```
src/lib/i18n/
  index.ts              # Runtime: stores, interpolation, pluralization, loading
  meta.ts               # Locale provenance metadata loader
  messages/
    en.ts               # English source (always present)
    <locale>.ts          # Generated locale files (ai_unverified)
  meta/
    en.json              # English metadata (source)
    <locale>.json        # Locale provenance + audit trail
  canonical/             # Generated from STS game JAR (gitignored)
    <locale>.json        # Canonical term glossaries
```

## Translation Flow

1. **Key definition**: Add keys to `messages/en.ts` in the appropriate namespace.
2. **Usage**: Use `$t('namespace.key')` in Svelte templates or `$tp('namespace.key', count)` for plurals.
3. **Extraction**: Run `pnpm i18n:extract` to generate canonical term glossaries from the STS game.
4. **Translation**: Run `pnpm i18n:translate --locale <code>` to generate AI translations via DeepL.
5. **Validation**: Run `pnpm i18n:validate` to check key parity, placeholders, metadata, and canonical terms.

## Locale Types

| Type | Description |
|------|-------------|
| `Locale` | Union type of supported locale codes |
| `TranslationKey` | Union type of all valid dot-path keys |
| `Translator` | `(key, params?) => string` |
| `PluralTranslator` | `(key, count, params?) => string` |
| `LocaleInfo` | Metadata for locale picker (name, status) |
| `LocaleMeta` | Provenance metadata with audit trail |

## Fallback Chain

`requested locale` -> `English` -> `key string itself`

Missing keys are reported via `console.warn` in development mode (deduplicated).

## Pluralization

Uses `Intl.PluralRules` (CLDR-compatible). Message values use pipe-separated forms:
- 2 forms: `one|other` (e.g., `"{count} run|{count} runs"`)
- 6 forms: `zero|one|two|few|many|other` (for languages like Arabic)
