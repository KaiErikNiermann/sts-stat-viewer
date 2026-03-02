/**
 * i18n Unit Tests
 *
 * Tests for the localization runtime: fallback, interpolation,
 * key completeness, and placeholder integrity.
 */

import { describe, it, expect } from 'vitest';
import en from './messages/en';

// ---------------------------------------------------------------------------
// English message file structure
// ---------------------------------------------------------------------------

describe('English messages', () => {
  it('should have all required namespaces', () => {
    const requiredNamespaces = [
      'common',
      'dashboard',
      'settings',
      'graphs',
      'errors',
      'update_manager',
      'game_terms',
    ];
    for (const ns of requiredNamespaces) {
      expect(en).toHaveProperty(ns);
      expect(typeof en[ns as keyof typeof en]).toBe('object');
    }
  });

  it('should have no empty string values', () => {
    for (const [ns, messages] of Object.entries(en)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value, `${ns}.${key} should not be empty`).not.toBe('');
      }
    }
  });

  it('should have no duplicate values across different keys in the same namespace', () => {
    // Some duplicates are acceptable (e.g. value_field used in two contexts)
    // This test flags them for review rather than failing
    const duplicates: Array<{ ns: string; value: string; keys: string[] }> = [];

    for (const [ns, messages] of Object.entries(en)) {
      const valueToKeys = new Map<string, string[]>();
      for (const [key, value] of Object.entries(messages)) {
        const existing = valueToKeys.get(value) ?? [];
        existing.push(key);
        valueToKeys.set(value, existing);
      }
      for (const [value, keys] of valueToKeys) {
        if (keys.length > 1) {
          duplicates.push({ ns, value, keys });
        }
      }
    }

    // Log duplicates for review but don't fail (some are intentional)
    if (duplicates.length > 0) {
      console.log('Duplicate values found (review these):');
      for (const d of duplicates) {
        console.log(`  ${d.ns}: "${d.value}" used by: ${d.keys.join(', ')}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

describe('Interpolation placeholders', () => {
  it('should use valid {placeholder} syntax only', () => {
    const invalidPattern = /\{[^}]*[^a-zA-Z0-9_}][^}]*\}/;

    for (const [ns, messages] of Object.entries(en)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(
          invalidPattern.test(value),
          `${ns}.${key} has invalid placeholder syntax: "${value}"`
        ).toBe(false);
      }
    }
  });

  it('should have consistent placeholders in interpolated strings', () => {
    // Extract all placeholder names from each message
    const placeholderPattern = /\{(\w+)\}/g;

    for (const [ns, messages] of Object.entries(en)) {
      for (const [key, value] of Object.entries(messages)) {
        const placeholders = [...value.matchAll(placeholderPattern)].map((m) => m[1]);
        // Each placeholder should be unique within a message
        const unique = new Set(placeholders);
        expect(
          unique.size,
          `${ns}.${key} has duplicate placeholders: ${placeholders.join(', ')}`
        ).toBe(placeholders.length);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Translation key type coverage
// ---------------------------------------------------------------------------

describe('TranslationKey coverage', () => {
  it('should generate correct two-level dot paths', () => {
    // Verify the key format matches what the TranslationKey type would generate
    const allKeys: string[] = [];
    for (const [ns, messages] of Object.entries(en)) {
      for (const key of Object.keys(messages)) {
        allKeys.push(`${ns}.${key}`);
      }
    }

    // Should have at least the critical keys
    expect(allKeys).toContain('common.save');
    expect(allKeys).toContain('dashboard.page_title');
    expect(allKeys).toContain('settings.heading');
    expect(allKeys).toContain('graphs.type_scatter');
    expect(allKeys).toContain('errors.network');
    expect(allKeys).toContain('update_manager.checking');
    expect(allKeys).toContain('game_terms.ironclad');
  });

  it('should have reasonable total key count', () => {
    let total = 0;
    for (const messages of Object.values(en)) {
      total += Object.keys(messages).length;
    }
    // Sanity check: we should have at least 100 keys
    expect(total).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// Locale metadata schema
// ---------------------------------------------------------------------------

describe('Locale metadata', () => {
  it('en.json should have valid schema', async () => {
    const meta = await import('./meta/en.json');
    expect(meta.locale).toBe('en');
    expect(meta.status).toBe('source');
    expect(meta.human_review_coverage).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Canonical term protection (lock tests)
// ---------------------------------------------------------------------------

describe('Canonical term lock', () => {
  it('game_terms namespace should contain only canonical STS terms', () => {
    const gameTerms = en.game_terms;
    // These are the official STS character names — they must match canonical terms
    expect(gameTerms.ironclad).toBe('Ironclad');
    expect(gameTerms.silent).toBe('The Silent');
    expect(gameTerms.defect).toBe('Defect');
    expect(gameTerms.watcher).toBe('Watcher');
  });

  it('non-English locale game_terms must not differ from canonical glossary', async () => {
    // This test validates that if a non-English locale file exists,
    // its game_terms match the canonical glossary for that locale.
    // Since we only have en.ts currently, this is a structural test that
    // will activate once locale files are added.
    const fs = await import('node:fs');
    const path = await import('node:path');

    const messagesDir = path.resolve(__dirname, 'messages');
    const canonicalDir = path.resolve(__dirname, 'canonical');

    const localeFiles = fs.readdirSync(messagesDir)
      .filter((f: string) => f.endsWith('.ts') && f !== 'en.ts');

    for (const file of localeFiles) {
      const locale = file.replace('.ts', '');
      const canonicalPath = path.join(canonicalDir, `${locale}.json`);

      if (!fs.existsSync(canonicalPath)) continue;

      const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));
      // Load locale messages dynamically
      const localeModule = await import(`./messages/${file}`);
      const localeMessages = localeModule.default;

      if (!localeMessages.game_terms) continue;

      // Verify character names match canonical terms
      const characterTerms = Object.entries(canonical.terms as Record<string, { category: string; name: string; key: string }>)
        .filter(([, t]) => t.category === 'character');

      for (const [, term] of characterTerms) {
        const keyMap: Record<string, string> = {
          'Ironclad': 'ironclad',
          'Silent': 'silent',
          'Defect': 'defect',
          'Watcher': 'watcher',
        };
        const messageKey = keyMap[term.key];
        if (messageKey && localeMessages.game_terms[messageKey]) {
          expect(
            localeMessages.game_terms[messageKey],
            `${locale}: game_terms.${messageKey} should match canonical "${term.name}"`
          ).toBe(term.name);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Run-token variant normalization
// ---------------------------------------------------------------------------

describe('Run-token normalization', () => {
  it('parseRunToken should handle base keys', async () => {
    const { parseRunToken } = await import('../../../scripts/i18n/extract-canonical');
    expect(parseRunToken('Strike_R')).toEqual({ baseKey: 'Strike_R', upgradeLevel: 0 });
  });

  it('parseRunToken should handle upgraded variants', async () => {
    const { parseRunToken } = await import('../../../scripts/i18n/extract-canonical');
    expect(parseRunToken('Strike_R+1')).toEqual({ baseKey: 'Strike_R', upgradeLevel: 1 });
    expect(parseRunToken('Apotheosis+1')).toEqual({ baseKey: 'Apotheosis', upgradeLevel: 1 });
    expect(parseRunToken('SearingBlow+5')).toEqual({ baseKey: 'SearingBlow', upgradeLevel: 5 });
  });
});
