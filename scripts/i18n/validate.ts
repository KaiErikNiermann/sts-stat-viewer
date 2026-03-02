#!/usr/bin/env npx tsx
/**
 * i18n Validation Script
 *
 * Standalone validation that runs without vitest. Checks:
 * - Key parity across locale files
 * - Placeholder integrity (same placeholders in source and target)
 * - Missing/unused key detection
 * - Metadata schema validation
 *
 * Usage:
 *   npx tsx scripts/i18n/validate.ts
 *
 * Exit code 0 = all checks pass, 1 = failures found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const I18N_DIR = path.resolve(__dirname, '../../src/lib/i18n');
const MESSAGES_DIR = path.join(I18N_DIR, 'messages');
const META_DIR = path.join(I18N_DIR, 'meta');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let failures = 0;
let warnings = 0;
let passes = 0;

function pass(msg: string): void {
  passes++;
  console.log(`  [PASS] ${msg}`);
}

function fail(msg: string): void {
  failures++;
  console.error(`  [FAIL] ${msg}`);
}

function warn(msg: string): void {
  warnings++;
  console.warn(`  [WARN] ${msg}`);
}

function extractPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

/** Parse message object from a .ts locale file */
function parseMessages(filePath: string): Record<string, Record<string, string>> | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  // For en.ts: extract between `const en = {` and `} as const`
  // For others: extract between `const <var> = {` and `} as const`
  const match = content.match(/const \w+ = (\{[\s\S]*?\}) as const/);
  if (!match) return null;

  try {
    const fn = new Function(`return (${match[1]})`);
    return fn() as Record<string, Record<string, string>>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Check 1: English messages structure
// ---------------------------------------------------------------------------

function checkEnglishStructure(en: Record<string, Record<string, string>>): void {
  console.log('\n1. English message structure');

  const requiredNamespaces = [
    'common', 'dashboard', 'settings', 'graphs',
    'errors', 'update_manager', 'game_terms',
  ];

  for (const ns of requiredNamespaces) {
    if (en[ns]) {
      pass(`Namespace "${ns}" exists (${Object.keys(en[ns]).length} keys)`);
    } else {
      fail(`Missing required namespace: ${ns}`);
    }
  }

  // Check for empty values
  let emptyCount = 0;
  for (const [ns, messages] of Object.entries(en)) {
    for (const [key, value] of Object.entries(messages)) {
      if (!value) {
        fail(`Empty value: ${ns}.${key}`);
        emptyCount++;
      }
    }
  }
  if (emptyCount === 0) pass('No empty string values');

  // Total key count
  const total = Object.values(en).reduce((sum, ns) => sum + Object.keys(ns).length, 0);
  pass(`Total keys: ${total}`);
}

// ---------------------------------------------------------------------------
// Check 2: Placeholder integrity
// ---------------------------------------------------------------------------

function checkPlaceholderIntegrity(en: Record<string, Record<string, string>>): void {
  console.log('\n2. Placeholder integrity (English)');

  let validCount = 0;
  const invalidPattern = /\{[^}]*[^a-zA-Z0-9_}][^}]*\}/;

  for (const [ns, messages] of Object.entries(en)) {
    for (const [key, value] of Object.entries(messages)) {
      if (invalidPattern.test(value)) {
        fail(`Invalid placeholder syntax in ${ns}.${key}: "${value}"`);
      } else {
        validCount++;
      }
    }
  }
  pass(`${validCount} messages have valid placeholder syntax`);
}

// ---------------------------------------------------------------------------
// Check 3: Key parity across locales
// ---------------------------------------------------------------------------

function checkKeyParity(en: Record<string, Record<string, string>>): void {
  console.log('\n3. Key parity across locale files');

  const localeFiles = fs.readdirSync(MESSAGES_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'en.ts'
  );

  if (localeFiles.length === 0) {
    pass('No non-English locale files yet (only en.ts exists)');
    return;
  }

  const enKeys = new Set<string>();
  for (const [ns, messages] of Object.entries(en)) {
    for (const key of Object.keys(messages)) {
      enKeys.add(`${ns}.${key}`);
    }
  }

  for (const file of localeFiles) {
    const locale = file.replace('.ts', '');
    const messages = parseMessages(path.join(MESSAGES_DIR, file));
    if (!messages) {
      fail(`Could not parse ${file}`);
      continue;
    }

    const localeKeys = new Set<string>();
    for (const [ns, nsMessages] of Object.entries(messages)) {
      for (const key of Object.keys(nsMessages)) {
        localeKeys.add(`${ns}.${key}`);
      }
    }

    // Check for missing keys
    const missing = [...enKeys].filter((k) => !localeKeys.has(k));
    const extra = [...localeKeys].filter((k) => !enKeys.has(k));

    if (missing.length === 0) {
      pass(`${locale}: all ${enKeys.size} English keys present`);
    } else {
      fail(`${locale}: missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }

    if (extra.length > 0) {
      warn(`${locale}: ${extra.length} extra keys not in English: ${extra.slice(0, 5).join(', ')}`);
    }

    // Check placeholder parity
    let placeholderMismatches = 0;
    for (const [ns, nsMessages] of Object.entries(messages)) {
      for (const [key, value] of Object.entries(nsMessages)) {
        const enValue = en[ns]?.[key];
        if (!enValue) continue;

        const enPlaceholders = extractPlaceholders(enValue);
        const localePlaceholders = extractPlaceholders(value);

        if (JSON.stringify(enPlaceholders) !== JSON.stringify(localePlaceholders)) {
          fail(`${locale}: placeholder mismatch in ${ns}.${key}: EN has {${enPlaceholders.join(',')}} but ${locale} has {${localePlaceholders.join(',')}}`);
          placeholderMismatches++;
        }
      }
    }

    if (placeholderMismatches === 0) {
      pass(`${locale}: placeholder integrity OK`);
    }
  }
}

// ---------------------------------------------------------------------------
// Check 4: Metadata schema
// ---------------------------------------------------------------------------

function checkMetadata(): void {
  console.log('\n4. Locale metadata validation');

  if (!fs.existsSync(META_DIR)) {
    fail('Meta directory does not exist');
    return;
  }

  const metaFiles = fs.readdirSync(META_DIR).filter((f) => f.endsWith('.json'));

  if (metaFiles.length === 0) {
    fail('No metadata files found');
    return;
  }

  const validStatuses = ['source', 'human_verified', 'ai_unverified'];

  for (const file of metaFiles) {
    const locale = file.replace('.json', '');
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(META_DIR, file), 'utf-8'));

      if (!meta.locale) {
        fail(`${file}: missing "locale" field`);
      } else if (meta.locale !== locale) {
        fail(`${file}: locale field "${meta.locale}" doesn't match filename "${locale}"`);
      } else {
        pass(`${file}: locale field matches`);
      }

      if (!validStatuses.includes(meta.status)) {
        fail(`${file}: invalid status "${meta.status}"`);
      } else {
        pass(`${file}: valid status "${meta.status}"`);
      }

      if (typeof meta.human_review_coverage !== 'number' || meta.human_review_coverage < 0 || meta.human_review_coverage > 100) {
        fail(`${file}: human_review_coverage must be 0-100, got ${meta.human_review_coverage}`);
      } else {
        pass(`${file}: review coverage ${meta.human_review_coverage}%`);
      }

      // Enforce: cannot be human_verified unless 100% reviewed
      if (meta.status === 'human_verified' && meta.human_review_coverage < 100) {
        fail(`${file}: status is "human_verified" but review coverage is only ${meta.human_review_coverage}% (must be 100%)`);
      }

      // Enforce: human_verified must have reviewed_by and reviewed_at
      if (meta.status === 'human_verified') {
        if (!meta.reviewed_by) {
          fail(`${file}: status is "human_verified" but "reviewed_by" is missing`);
        }
        if (!meta.reviewed_at) {
          fail(`${file}: status is "human_verified" but "reviewed_at" is missing`);
        }
      }

      // Validate history (audit trail)
      if (meta.history && Array.isArray(meta.history)) {
        pass(`${file}: has audit trail (${meta.history.length} entries)`);
      } else {
        warn(`${file}: no "history" audit trail field`);
      }
    } catch (e) {
      fail(`${file}: invalid JSON - ${e}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Check 5: Source code key usage audit
// ---------------------------------------------------------------------------

function checkKeyUsage(en: Record<string, Record<string, string>>): void {
  console.log('\n5. Key usage audit');

  // Build set of all defined keys
  const definedKeys = new Set<string>();
  for (const [ns, messages] of Object.entries(en)) {
    for (const key of Object.keys(messages)) {
      definedKeys.add(`${ns}.${key}`);
    }
  }

  // Scan source files for $t('key') and get(t)('key') patterns
  const srcDir = path.resolve(__dirname, '../../src');
  const usedKeys = new Set<string>();

  function scanFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Match $t('key') and tr('key') patterns
    const pattern = /(?:\$t|tr)\(\s*'([^']+)'/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      usedKeys.add(match[1]);
    }
  }

  function scanDir(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        // Skip the i18n directory itself — it contains JSDoc examples with $t('key')
        if (full.endsWith('/i18n') || full.endsWith('/i18n/messages') || full.endsWith('/i18n/meta')) {
          continue;
        }
        scanDir(full);
      } else if (entry.isFile() && /\.(svelte|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        scanFile(full);
      }
    }
  }

  scanDir(srcDir);

  const unused = [...definedKeys].filter((k) => !usedKeys.has(k));
  const undefined_ = [...usedKeys].filter((k) => !definedKeys.has(k));

  if (undefined_.length === 0) {
    pass(`All ${usedKeys.size} used keys are defined`);
  } else {
    for (const key of undefined_) {
      fail(`Key used in source but not defined: "${key}"`);
    }
  }

  if (unused.length === 0) {
    pass(`All ${definedKeys.size} defined keys are used`);
  } else {
    for (const key of unused) {
      warn(`Key defined but not used in source: "${key}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Check 6: Canonical term lock
// ---------------------------------------------------------------------------

const CANONICAL_DIR = path.join(I18N_DIR, 'canonical');

/** Map of game_terms message key -> canonical glossary character key */
const CHARACTER_KEY_MAP: Record<string, string> = {
  ironclad: 'Ironclad',
  silent: 'Silent',
  defect: 'Defect',
  watcher: 'Watcher',
};

function checkCanonicalTermLock(en: Record<string, Record<string, string>>): void {
  console.log('\n6. Canonical term lock');

  if (!fs.existsSync(CANONICAL_DIR)) {
    pass('No canonical directory (run pnpm i18n:extract to generate)');
    return;
  }

  const localeFiles = fs.readdirSync(MESSAGES_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'en.ts'
  );

  if (localeFiles.length === 0) {
    pass('No non-English locale files to check against canonical terms');
    return;
  }

  for (const file of localeFiles) {
    const locale = file.replace('.ts', '');
    const messages = parseMessages(path.join(MESSAGES_DIR, file));
    if (!messages?.game_terms) continue;

    const canonicalPath = path.join(CANONICAL_DIR, `${locale}.json`);
    if (!fs.existsSync(canonicalPath)) {
      warn(`${locale}: no canonical glossary found for term lock check`);
      continue;
    }

    let glossary: { terms: Record<string, { category: string; name: string; key: string }> };
    try {
      glossary = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));
    } catch {
      warn(`${locale}: could not parse canonical glossary`);
      continue;
    }

    let lockViolations = 0;

    // Check character names match canonical terms
    for (const [messageKey, canonicalCharKey] of Object.entries(CHARACTER_KEY_MAP)) {
      const translatedValue = messages.game_terms[messageKey];
      if (!translatedValue) continue;

      // Find the canonical character term
      const canonicalEntry = Object.values(glossary.terms).find(
        (t) => t.category === 'character' && t.key === canonicalCharKey
      );

      if (canonicalEntry && translatedValue !== canonicalEntry.name) {
        fail(`${locale}: game_terms.${messageKey} is "${translatedValue}" but canonical term is "${canonicalEntry.name}"`);
        lockViolations++;
      }
    }

    if (lockViolations === 0) {
      pass(`${locale}: canonical term lock OK`);
    }
  }
}

// ---------------------------------------------------------------------------
// Check 7: Translation completeness report
// ---------------------------------------------------------------------------

function checkTranslationCompleteness(en: Record<string, Record<string, string>>): void {
  console.log('\n7. Translation completeness');

  const enKeys = new Set<string>();
  for (const [ns, messages] of Object.entries(en)) {
    for (const key of Object.keys(messages)) {
      enKeys.add(`${ns}.${key}`);
    }
  }

  const localeFiles = fs.readdirSync(MESSAGES_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'en.ts'
  );

  if (localeFiles.length === 0) {
    pass(`English source: ${enKeys.size} keys (no other locales yet)`);
    return;
  }

  for (const file of localeFiles) {
    const locale = file.replace('.ts', '');
    const messages = parseMessages(path.join(MESSAGES_DIR, file));
    if (!messages) {
      warn(`${locale}: could not parse for completeness check`);
      continue;
    }

    let translated = 0;
    let identical = 0;

    for (const [ns, nsMessages] of Object.entries(messages)) {
      for (const [key, value] of Object.entries(nsMessages)) {
        translated++;
        // Check if the value is identical to English (possibly untranslated)
        const enValue = en[ns]?.[key];
        if (enValue && value === enValue) {
          identical++;
        }
      }
    }

    const coverage = Math.round((translated / enKeys.size) * 100);
    const uniqueTranslations = translated - identical;

    pass(`${locale}: ${coverage}% key coverage (${translated}/${enKeys.size}), ${uniqueTranslations} unique translations, ${identical} identical to English`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== i18n Validation ===');

  const en = parseMessages(path.join(MESSAGES_DIR, 'en.ts'));
  if (!en) {
    console.error('FATAL: Could not parse src/lib/i18n/messages/en.ts');
    process.exit(1);
  }

  checkEnglishStructure(en);
  checkPlaceholderIntegrity(en);
  checkKeyParity(en);
  checkMetadata();
  checkKeyUsage(en);
  checkCanonicalTermLock(en);
  checkTranslationCompleteness(en);

  console.log(`\n=== Results: ${passes} passed, ${failures} failed, ${warnings} warnings ===`);

  if (failures > 0) {
    process.exit(1);
  }
}

main();
