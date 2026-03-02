# Canonical STS Term Extraction

## Purpose

The canonical term extraction pipeline reads official Slay the Spire localization assets from the game's JAR file and generates term glossaries used to protect game terminology during machine translation.

## How It Works

1. The script reads `desktop-1.0.jar` from the local STS installation.
2. It extracts `localization/<lang>/*.json` files (cards, relics, characters, potions, monsters, powers, orbs, keywords).
3. For each locale, it generates a `<bcp47>.json` glossary in `src/lib/i18n/canonical/`.
4. Upgraded card variants (e.g., `Strike_R+1`) are also generated automatically.

## Usage

```bash
# Auto-detect JAR from common Steam paths
pnpm i18n:extract

# Specify JAR path manually
pnpm i18n:extract --jar /path/to/desktop-1.0.jar

# Extract specific locales only
pnpm i18n:extract --locales eng,deu,fra

# Preview without writing files
pnpm i18n:extract --dry-run
```

## STS Locale Code to BCP-47 Mapping

| STS Code | BCP-47 | Language |
|----------|--------|----------|
| eng | en | English |
| deu | de | German |
| fra | fr | French |
| spa | es | Spanish |
| ita | it | Italian |
| jpn | ja | Japanese |
| kor | ko | Korean |
| zhs | zh-Hans | Chinese (Simplified) |
| zht | zh-Hant | Chinese (Traditional) |
| rus | ru | Russian |
| ptb | pt-BR | Portuguese (Brazilian) |
| pol | pl | Polish |
| ... | ... | (25 locales total) |

## Glossary Format

Each glossary file contains:

```json
{
  "locale": "deu",
  "bcp47": "de",
  "extractedAt": "2026-02-16T...",
  "jarPath": "/path/to/desktop-1.0.jar",
  "termCount": 1331,
  "terms": {
    "card:Strike_R": {
      "key": "Strike_R",
      "name": "Hieb",
      "category": "card",
      "source": "cards.json"
    },
    "card:Strike_R+1": {
      "key": "Strike_R+1",
      "name": "Hieb+",
      "category": "card",
      "source": "cards.json"
    }
  }
}
```

## Run-Token Normalization

STS run data encodes upgraded cards as `CardKey+N` (e.g., `Strike_R+1`). The extraction script generates variant entries so these resolve at runtime without string manipulation.

`parseRunToken("Strike_R+1")` returns `{ baseKey: "Strike_R", upgradeLevel: 1 }`.

## Legal Note

Canonical glossary files are gitignored because they are derived from copyrighted game assets. They are generated locally from each developer's own game installation.
