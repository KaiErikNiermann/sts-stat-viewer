#!/usr/bin/env npx tsx
/**
 * DeepL-assisted Translation Pipeline
 *
 * Translates English message files to target locales using the DeepL API,
 * with canonical STS term protection and provenance metadata.
 *
 * Usage:
 *   npx tsx scripts/i18n/translate.ts --locale <bcp47> [--dry-run] [--namespace <ns>]
 *
 * Options:
 *   --locale <code>      Target BCP-47 locale (e.g. de, fr, ja)
 *   --namespace <ns>     Only translate a specific namespace (default: all)
 *   --formality <mode>   DeepL formality: default, more, less, prefer_more, prefer_less
 *   --dry-run            Print what would be translated without calling DeepL
 *
 * Environment:
 *   DEEPL_API_KEY        Required. DeepL API authentication key.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// BCP-47 to DeepL target language mapping
// ---------------------------------------------------------------------------

const BCP47_TO_DEEPL: Record<string, string> = {
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  'pt-BR': 'PT-BR',
  ru: 'RU',
  pl: 'PL',
  tr: 'TR',
  uk: 'UK',
  ja: 'JA',
  ko: 'KO',
  'zh-Hans': 'ZH-HANS',
  'zh-Hant': 'ZH-HANT',
  nl: 'NL',
  fi: 'FI',
  el: 'EL',
  id: 'ID',
  nb: 'NB',  // Norwegian Bokmal
  sv: 'SV',
  da: 'DA',
  cs: 'CS',
  sk: 'SK',
  ro: 'RO',
  bg: 'BG',
  hu: 'HU',
  et: 'ET',
  lv: 'LV',
  lt: 'LT',
  sl: 'SL',
};

// Locales that support formality in DeepL
const FORMALITY_SUPPORTED = new Set([
  'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'PT-BR', 'RU', 'JA',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanonicalTerm {
  key: string;
  name: string;
  category: string;
  source: string;
}

interface CanonicalGlossary {
  terms: Record<string, CanonicalTerm>;
}

interface HistoryEntry {
  action: string;
  status: string;
  by: string;
  at: string;
  notes: string;
}

interface TranslationMeta {
  locale: string;
  status: 'ai_unverified';
  human_review_coverage: 0;
  reviewed_by: null;
  reviewed_at: null;
  generated_by: string;
  generated_at: string;
  notes: string;
  history: HistoryEntry[];
}

// ---------------------------------------------------------------------------
// Canonical term protection
// ---------------------------------------------------------------------------

/**
 * Build a map of English canonical terms -> target locale terms
 * for use as a post-translation replacement pass.
 */
function loadCanonicalTerms(
  enGlossaryPath: string,
  targetGlossaryPath: string
): Map<string, string> {
  const map = new Map<string, string>();

  if (!fs.existsSync(enGlossaryPath) || !fs.existsSync(targetGlossaryPath)) {
    return map;
  }

  const enGlossary: CanonicalGlossary = JSON.parse(fs.readFileSync(enGlossaryPath, 'utf-8'));
  const targetGlossary: CanonicalGlossary = JSON.parse(fs.readFileSync(targetGlossaryPath, 'utf-8'));

  for (const [mapKey, enTerm] of Object.entries(enGlossary.terms)) {
    const targetTerm = targetGlossary.terms[mapKey];
    if (targetTerm && enTerm.name !== targetTerm.name) {
      map.set(enTerm.name, targetTerm.name);
    }
  }

  return map;
}

/**
 * Replace {placeholder} tokens with XML-tagged placeholders that DeepL preserves.
 * Returns the protected string and a map to restore tokens after translation.
 */
function protectPlaceholders(text: string): { protected: string; tokens: Map<string, string> } {
  const tokens = new Map<string, string>();
  let idx = 0;
  const protectedText = text.replace(/\{(\w+)\}/g, (match) => {
    const tag = `<x id="${idx++}">${match}</x>`;
    tokens.set(tag, match);
    return tag;
  });
  return { protected: protectedText, tokens };
}

/**
 * Restore placeholders from XML tags back to {placeholder} syntax.
 */
function restorePlaceholders(text: string, tokens: Map<string, string>): string {
  let result = text;
  for (const [tag, original] of tokens) {
    result = result.replace(tag, original);
  }
  // Also handle cases where DeepL might slightly alter the XML
  result = result.replace(/<x id="\d+">(\{[^}]+\})<\/x>/g, '$1');
  return result;
}

// ---------------------------------------------------------------------------
// DeepL API
// ---------------------------------------------------------------------------

interface DeepLTranslation {
  detected_source_language: string;
  text: string;
}

interface DeepLResponse {
  translations: DeepLTranslation[];
}

async function translateBatch(
  texts: string[],
  targetLang: string,
  apiKey: string,
  formality: string
): Promise<string[]> {
  const url = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  const body: Record<string, unknown> = {
    text: texts,
    source_lang: 'EN',
    target_lang: targetLang,
    tag_handling: 'xml',
    ignore_tags: ['x'],
    preserve_formatting: true,
  };

  if (FORMALITY_SUPPORTED.has(targetLang) && formality !== 'default') {
    body.formality = formality;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API error ${response.status}: ${errorText}`);
  }

  const data: DeepLResponse = await response.json();
  return data.translations.map((t) => t.text);
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function loadEnglishMessages(): Record<string, Record<string, string>> {
  const enPath = path.resolve(__dirname, '../../src/lib/i18n/messages/en.ts');
  // Read the TS file and extract the object - we'll eval it in a safe way
  const content = fs.readFileSync(enPath, 'utf-8');

  // Extract the object between `const en = {` and `} as const`
  const match = content.match(/const en = (\{[\s\S]*?\}) as const/);
  if (!match) {
    throw new Error('Could not parse English messages from en.ts');
  }

  // Use Function constructor to safely evaluate the object literal
  const fn = new Function(`return (${match[1]})`);
  return fn() as Record<string, Record<string, string>>;
}

async function translateNamespace(
  ns: string,
  messages: Record<string, string>,
  targetLang: string,
  canonicalMap: Map<string, string>,
  apiKey: string,
  formality: string,
  dryRun: boolean
): Promise<Record<string, string>> {
  const keys = Object.keys(messages);
  const values = Object.values(messages);

  if (dryRun) {
    console.log(`    [DRY] ${ns}: ${keys.length} keys`);
    return messages; // Return English as placeholder
  }

  // Protect placeholders
  const protectedValues = values.map((v) => protectPlaceholders(v));
  const textsToTranslate = protectedValues.map((p) => p.protected);

  // Translate in batches of 50 (DeepL limit)
  const BATCH_SIZE = 50;
  const translatedTexts: string[] = [];

  for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
    const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
    const results = await translateBatch(batch, targetLang, apiKey, formality);
    translatedTexts.push(...results);

    // Rate limiting - small delay between batches
    if (i + BATCH_SIZE < textsToTranslate.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Restore placeholders and apply canonical term corrections
  const result: Record<string, string> = {};
  for (let i = 0; i < keys.length; i++) {
    let translated = restorePlaceholders(translatedTexts[i], protectedValues[i].tokens);

    // Apply canonical term replacements
    for (const [enTerm, localizedTerm] of canonicalMap) {
      // Only replace whole-word matches to avoid partial replacements
      const regex = new RegExp(`\\b${escapeRegex(enTerm)}\\b`, 'gi');
      translated = translated.replace(regex, localizedTerm);
    }

    result[keys[i]] = translated;
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliArgs {
  locale: string | null;
  namespace: string | null;
  formality: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let locale: string | null = null;
  let namespace: string | null = null;
  let formality = 'prefer_more';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--locale' && args[i + 1]) {
      locale = args[++i];
    } else if (args[i] === '--namespace' && args[i + 1]) {
      namespace = args[++i];
    } else if (args[i] === '--formality' && args[i + 1]) {
      formality = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { locale, namespace, formality, dryRun };
}

async function main(): Promise<void> {
  const { locale, namespace, formality, dryRun } = parseArgs();

  if (!locale) {
    console.error('Error: --locale is required (e.g. --locale de)');
    process.exit(1);
  }

  const deeplTarget = BCP47_TO_DEEPL[locale];
  if (!deeplTarget) {
    console.error(`Error: Unsupported locale "${locale}". Supported: ${Object.keys(BCP47_TO_DEEPL).join(', ')}`);
    process.exit(1);
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('Error: DEEPL_API_KEY environment variable is required');
    console.error('Set it with: export DEEPL_API_KEY=your-key-here');
    process.exit(1);
  }

  console.log(`Target locale: ${locale} (DeepL: ${deeplTarget})`);
  console.log(`Formality: ${formality}`);
  if (dryRun) console.log('Mode: DRY RUN');

  // Load English messages
  const enMessages = loadEnglishMessages();
  console.log(`English namespaces: ${Object.keys(enMessages).join(', ')}`);

  // Load canonical terms if available
  const canonicalDir = path.resolve(__dirname, '../../src/lib/i18n/canonical');
  const canonicalMap = loadCanonicalTerms(
    path.join(canonicalDir, 'en.json'),
    path.join(canonicalDir, `${locale}.json`)
  );
  console.log(`Canonical term pairs loaded: ${canonicalMap.size}`);

  // Translate each namespace
  const translatedMessages: Record<string, Record<string, string>> = {};
  const namespacesToProcess = namespace
    ? [namespace]
    : Object.keys(enMessages);

  for (const ns of namespacesToProcess) {
    if (!enMessages[ns]) {
      console.warn(`  [SKIP] Unknown namespace: ${ns}`);
      continue;
    }

    console.log(`  Translating: ${ns} (${Object.keys(enMessages[ns]).length} keys)...`);
    translatedMessages[ns] = await translateNamespace(
      ns,
      enMessages[ns],
      deeplTarget,
      canonicalMap,
      apiKey ?? '',
      formality,
      dryRun
    );
  }

  if (dryRun) {
    console.log('\n(Dry run — no files written)');
    return;
  }

  // Write output message file
  const outputDir = path.resolve(__dirname, '../../src/lib/i18n/messages');
  const outputPath = path.join(outputDir, `${locale}.ts`);

  const fileContent = `/**
 * ${locale.toUpperCase()} locale — AI-generated via DeepL.
 * Status: ai_unverified | Generated: ${new Date().toISOString()}
 *
 * DO NOT EDIT MANUALLY — regenerate with: pnpm i18n:translate --locale ${locale}
 * Canonical STS terms are protected from generic machine translation.
 */
const ${locale.replace('-', '_')} = ${JSON.stringify(translatedMessages, null, 2)} as const satisfies Record<string, Record<string, string>>;

export default ${locale.replace('-', '_')};
`;

  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`\nWrote: ${path.relative(process.cwd(), outputPath)}`);

  // Write/update locale metadata
  const metaDir = path.resolve(__dirname, '../../src/lib/i18n/meta');
  fs.mkdirSync(metaDir, { recursive: true });
  const metaPath = path.join(metaDir, `${locale}.json`);

  // Load existing history if the file exists
  let existingHistory: HistoryEntry[] = [];
  if (fs.existsSync(metaPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      existingHistory = existing.history ?? [];
    } catch { /* ignore parse errors */ }
  }

  const now = new Date().toISOString();

  const meta: TranslationMeta = {
    locale,
    status: 'ai_unverified',
    human_review_coverage: 0,
    reviewed_by: null,
    reviewed_at: null,
    generated_by: `deepl-api (formality=${formality})`,
    generated_at: now,
    notes: `Auto-generated. ${canonicalMap.size} canonical STS terms protected.`,
    history: [
      ...existingHistory,
      {
        action: existingHistory.length === 0 ? 'created' : 'regenerated',
        status: 'ai_unverified',
        by: `deepl-api (formality=${formality})`,
        at: now,
        notes: `${Object.keys(translatedMessages).length} namespaces, ${canonicalMap.size} canonical terms protected.`,
      },
    ],
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  console.log(`Wrote: ${path.relative(process.cwd(), metaPath)}`);

  console.log('\nDone. Remember to:');
  console.log(`  1. Register the locale in src/lib/i18n/index.ts (SUPPORTED_LOCALES, Locale type)`);
  console.log(`  2. Add the dynamic import in loadLocale()`);
  console.log(`  3. Run pnpm check to verify`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
