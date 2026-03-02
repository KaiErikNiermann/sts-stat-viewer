#!/usr/bin/env npx tsx
/**
 * Canonical STS Term Extraction Script
 *
 * Reads Slay the Spire localization assets from the game's desktop-1.0.jar,
 * parses cards, relics, characters, potions, and other term files,
 * and generates normalized term maps per locale.
 *
 * Output: src/lib/i18n/canonical/<locale>.json
 *
 * Usage:
 *   npx tsx scripts/i18n/extract-canonical.ts [--jar <path>] [--locales <codes>] [--dry-run]
 *
 * Options:
 *   --jar <path>       Path to desktop-1.0.jar (auto-detected from common Steam paths)
 *   --locales <codes>  Comma-separated STS locale codes (default: all)
 *   --dry-run          Print summary without writing files
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// STS locale code -> BCP-47 mapping
// ---------------------------------------------------------------------------

const STS_TO_BCP47: Record<string, string> = {
  eng: 'en',
  deu: 'de',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  ptb: 'pt-BR',
  rus: 'ru',
  pol: 'pl',
  tur: 'tr',
  ukr: 'uk',
  jpn: 'ja',
  jpn2: 'ja-alt',
  kor: 'ko',
  zhs: 'zh-Hans',
  zht: 'zh-Hant',
  dut: 'nl',
  fin: 'fi',
  gre: 'el',
  ind: 'id',
  nor: 'no',
  srb: 'sr-Cyrl',
  srp: 'sr-Latn',
  tha: 'th',
  vie: 'vi',
  epo: 'eo',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanonicalTerm {
  /** Internal STS key (e.g. "Strike_R", "Burning Blood") */
  key: string;
  /** Display name in this locale */
  name: string;
  /** Term category */
  category: 'card' | 'relic' | 'character' | 'potion' | 'monster' | 'power' | 'orb' | 'event' | 'keyword';
  /** Source file in the JAR */
  source: string;
}

interface CanonicalGlossary {
  locale: string;
  bcp47: string;
  extractedAt: string;
  jarPath: string;
  termCount: number;
  terms: Record<string, CanonicalTerm>;
}

// ---------------------------------------------------------------------------
// JAR auto-detection
// ---------------------------------------------------------------------------

const COMMON_JAR_PATHS = [
  // Linux Steam
  `${process.env['HOME']}/.local/share/Steam/steamapps/common/SlayTheSpire/desktop-1.0.jar`,
  // macOS Steam
  `${process.env['HOME']}/Library/Application Support/Steam/steamapps/common/SlayTheSpire/desktop-1.0.jar`,
  // Windows Steam (WSL)
  `/mnt/c/Program Files (x86)/Steam/steamapps/common/SlayTheSpire/desktop-1.0.jar`,
];

function findJar(): string | null {
  for (const p of COMMON_JAR_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// JAR extraction helpers
// ---------------------------------------------------------------------------

function extractJsonFromJar(jarPath: string, entryPath: string): unknown | null {
  try {
    const raw = execSync(`unzip -p "${jarPath}" "${entryPath}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function listJarLocales(jarPath: string): string[] {
  const output = execSync(
    `unzip -l "${jarPath}" | grep "localization/" | awk '{print $NF}' | sed 's|localization/||' | cut -d/ -f1 | sort -u`,
    { encoding: 'utf-8' }
  );
  return output
    .trim()
    .split('\n')
    .filter((l: string) => l && !l.includes('.') && l !== 'com' && l !== 'scripts' && l !== 'www');
}

// ---------------------------------------------------------------------------
// Term extraction per resource type
// ---------------------------------------------------------------------------

function extractCards(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'card', source });
    }
  }
  return terms;
}

function extractRelics(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'relic', source });
    }
  }
  return terms;
}

function extractCharacters(data: Record<string, { NAMES?: string[] }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  // Only extract the 4 playable characters
  const playable = ['Ironclad', 'Silent', 'Defect', 'Watcher'];
  for (const [key, entry] of Object.entries(data)) {
    if (playable.includes(key) && entry.NAMES?.[0]) {
      terms.push({ key, name: entry.NAMES[0], category: 'character', source });
    }
  }
  return terms;
}

function extractPotions(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'potion', source });
    }
  }
  return terms;
}

function extractMonsters(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'monster', source });
    }
  }
  return terms;
}

function extractPowers(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'power', source });
    }
  }
  return terms;
}

function extractOrbs(data: Record<string, { NAME?: string }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAME) {
      terms.push({ key, name: entry.NAME, category: 'orb', source });
    }
  }
  return terms;
}

function extractKeywords(data: Record<string, { NAMES?: string[] }>, source: string): CanonicalTerm[] {
  const terms: CanonicalTerm[] = [];
  for (const [key, entry] of Object.entries(data)) {
    if (entry.NAMES?.[0]) {
      terms.push({ key, name: entry.NAMES[0], category: 'keyword', source });
    }
  }
  return terms;
}

// ---------------------------------------------------------------------------
// Run-token variant normalization
// ---------------------------------------------------------------------------

/**
 * STS run data encodes upgraded cards as "CardKey+N" (e.g. "Strike_R+1").
 * This generates additional glossary entries for upgraded variants so they
 * can be resolved at runtime without string manipulation.
 *
 * The transform is reversible: parseRunToken("Strike_R+1") =>
 *   { baseKey: "Strike_R", upgradeLevel: 1 }
 */
export function parseRunToken(token: string): { baseKey: string; upgradeLevel: number } {
  const match = token.match(/^(.+)\+(\d+)$/);
  if (match) {
    return { baseKey: match[1]!, upgradeLevel: parseInt(match[2]!, 10) };
  }
  return { baseKey: token, upgradeLevel: 0 };
}

/**
 * Generate upgraded variant entries for all card terms.
 * Upgraded cards get a "+" suffix on their display name (STS convention).
 */
function generateUpgradedVariants(terms: Record<string, CanonicalTerm>): Record<string, CanonicalTerm> {
  const variants: Record<string, CanonicalTerm> = {};

  for (const [mapKey, term] of Object.entries(terms)) {
    if (term.category !== 'card') continue;

    // Generate +1 variant (most common upgrade level)
    const upgradedMapKey = `${mapKey}+1`;
    variants[upgradedMapKey] = {
      key: `${term.key}+1`,
      name: `${term.name}+`,
      category: 'card',
      source: term.source,
    };
  }

  return variants;
}

// ---------------------------------------------------------------------------
// Main extraction for a single locale
// ---------------------------------------------------------------------------

function extractLocale(jarPath: string, stsCode: string): CanonicalGlossary | null {
  const bcp47 = STS_TO_BCP47[stsCode] ?? stsCode;
  const prefix = `localization/${stsCode}`;
  const allTerms: Record<string, CanonicalTerm> = {};

  const extractors: Array<{
    file: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extract: (data: any, source: string) => CanonicalTerm[];
  }> = [
    { file: 'cards.json', extract: extractCards },
    { file: 'relics.json', extract: extractRelics },
    { file: 'characters.json', extract: extractCharacters },
    { file: 'potions.json', extract: extractPotions },
    { file: 'monsters.json', extract: extractMonsters },
    { file: 'powers.json', extract: extractPowers },
    { file: 'orbs.json', extract: extractOrbs },
    { file: 'keywords.json', extract: extractKeywords },
  ];

  let totalExtracted = 0;

  for (const { file, extract } of extractors) {
    const entryPath = `${prefix}/${file}`;
    const data = extractJsonFromJar(jarPath, entryPath);
    if (!data || typeof data !== 'object') continue;

    const terms = extract(data as Record<string, unknown>, file);
    for (const term of terms) {
      // Use category:key as the map key to avoid collisions across categories
      const mapKey = `${term.category}:${term.key}`;
      allTerms[mapKey] = term;
      totalExtracted++;
    }
  }

  if (totalExtracted === 0) return null;

  // Generate upgraded card variants (CardKey+1 -> "CardName+")
  const upgradedVariants = generateUpgradedVariants(allTerms);
  for (const [mapKey, term] of Object.entries(upgradedVariants)) {
    allTerms[mapKey] = term;
    totalExtracted++;
  }

  return {
    locale: stsCode,
    bcp47,
    extractedAt: new Date().toISOString(),
    jarPath,
    termCount: totalExtracted,
    terms: allTerms,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { jarPath: string | null; locales: string[] | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let jarPath: string | null = null;
  let locales: string[] | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--jar' && args[i + 1]) {
      jarPath = args[++i]!;
    } else if (args[i] === '--locales' && args[i + 1]) {
      locales = args[++i]!.split(',');
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { jarPath, locales, dryRun };
}

function main(): void {
  const { jarPath: cliJar, locales: cliLocales, dryRun } = parseArgs();

  const jarPath = cliJar ?? findJar();
  if (!jarPath || !fs.existsSync(jarPath)) {
    console.error('Error: Could not find desktop-1.0.jar');
    console.error('Provide the path with: --jar /path/to/desktop-1.0.jar');
    process.exit(1);
  }

  console.log(`Using JAR: ${jarPath}`);

  const availableLocales = listJarLocales(jarPath!);
  const targetLocales = cliLocales ?? availableLocales;

  console.log(`Available locales in JAR: ${availableLocales.join(', ')}`);
  console.log(`Extracting: ${targetLocales.join(', ')}`);

  const outputDir = path.resolve(__dirname, '../../src/lib/i18n/canonical');
  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const summary: Array<{ locale: string; bcp47: string; terms: number }> = [];

  for (const stsCode of targetLocales) {
    const glossary = extractLocale(jarPath, stsCode);
    if (!glossary) {
      console.warn(`  [SKIP] ${stsCode}: no terms extracted`);
      continue;
    }

    const bcp47 = STS_TO_BCP47[stsCode] ?? stsCode;
    summary.push({ locale: stsCode, bcp47, terms: glossary.termCount });

    if (dryRun) {
      console.log(`  [DRY] ${stsCode} (${bcp47}): ${glossary.termCount} terms`);
    } else {
      const outPath = path.join(outputDir, `${bcp47}.json`);
      fs.writeFileSync(outPath, JSON.stringify(glossary, null, 2) + '\n', 'utf-8');
      console.log(`  [OK]  ${stsCode} (${bcp47}): ${glossary.termCount} terms -> ${path.relative(process.cwd(), outPath)}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  Locales processed: ${summary.length}`);
  console.log(`  Total terms: ${summary.reduce((s, r) => s + r.terms, 0)}`);

  if (dryRun) {
    console.log('\n(Dry run — no files written)');
  }
}

main();
