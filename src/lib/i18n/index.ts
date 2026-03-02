/**
 * Typed i18n runtime for STS Stat Viewer.
 *
 * - English is the source locale and always-available fallback.
 * - Locale bundles are loaded lazily (future non-English locales).
 * - The reactive `t` store returns a translator function for use in templates as `$t('key')`.
 * - All keys are compile-time checked via TranslationKey.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { dev } from '$app/environment';
import en, { type Messages } from './messages/en';

// ---------------------------------------------------------------------------
// Locale type — expand as locales are added
// ---------------------------------------------------------------------------

export type Locale = 'en';

export type LocaleStatus = 'source' | 'human_verified' | 'ai_unverified';

export interface LocaleInfo {
  readonly code: Locale;
  readonly name: string;         // Native name (e.g. "Deutsch")
  readonly englishName: string;  // English name (e.g. "German")
  readonly status: LocaleStatus;
}

/** All supported locales with metadata. English is always first and is the source locale. */
export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  { code: 'en', name: 'English', englishName: 'English', status: 'source' },
] as const;

function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some(l => l.code === value);
}

// ---------------------------------------------------------------------------
// Translation key type — two-level dot path derived from the English source
// ---------------------------------------------------------------------------

export type TranslationKey = {
  [NS in keyof Messages & string]: `${NS}.${keyof Messages[NS] & string}`;
}[keyof Messages & string];

// ---------------------------------------------------------------------------
// Interpolation & Pluralization
// ---------------------------------------------------------------------------

type InterpolationParams = Record<string, string | number>;

function interpolate(template: string, params?: InterpolationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * CLDR-compatible pluralization using Intl.PluralRules.
 *
 * Plural messages use pipe-separated forms: "one|other" or "zero|one|two|few|many|other".
 * The simplest form for English is "1 item|{count} items" (one|other).
 *
 * Usage: tp('graphs.run_count', count) where the message value is "{count} run|{count} runs"
 */
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(loc: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(loc);
  if (!rules) {
    rules = new Intl.PluralRules(loc);
    pluralRulesCache.set(loc, rules);
  }
  return rules;
}

/** CLDR plural categories in canonical order. */
const PLURAL_CATEGORIES: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

function selectPlural(template: string, count: number, loc: string): string {
  const forms = template.split('|');
  if (forms.length === 1) return template;

  const rules = getPluralRules(loc);
  const category = rules.select(count);
  const categoryIndex = PLURAL_CATEGORIES.indexOf(category);

  // If the template has exactly 2 forms, treat as "one|other" (most common)
  if (forms.length === 2) {
    return (category === 'one' ? forms[0] : forms[1])!;
  }

  // For more forms, map by CLDR category index, falling back to last form (other)
  return forms[categoryIndex] ?? forms.at(-1)!;
}

// ---------------------------------------------------------------------------
// Message resolution
// ---------------------------------------------------------------------------

/** Loaded message bundles keyed by locale. English is always present. */
const bundles = new Map<string, Record<string, Record<string, string>>>();
bundles.set('en', en);

function resolve(loc: string, key: string): string | undefined {
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) return undefined;

  const ns = key.substring(0, dotIndex);
  const k = key.substring(dotIndex + 1);

  const bundle = bundles.get(loc);
  if (!bundle) return undefined;

  const namespace = bundle[ns];
  if (!namespace) return undefined;

  return namespace[k];
}

// ---------------------------------------------------------------------------
// Locale store
// ---------------------------------------------------------------------------

const LOCALE_STORAGE_KEY = 'sts-locale';

function getInitialLocale(): Locale {
  if (browser) {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isValidLocale(stored)) return stored;
  }
  return 'en';
}

export const locale = writable<Locale>(getInitialLocale());

// ---------------------------------------------------------------------------
// Reactive translator store — use as $t('namespace.key', { param: value })
// ---------------------------------------------------------------------------

export type Translator = (key: TranslationKey, params?: InterpolationParams) => string;
export type PluralTranslator = (key: TranslationKey, count: number, params?: InterpolationParams) => string;

/** Track reported missing keys to avoid console spam (dev only). */
const reportedMissingKeys = new Set<string>();

export const t = derived<typeof locale, Translator>(locale, ($locale) => {
  return (key: TranslationKey, params?: InterpolationParams): string => {
    // Try requested locale, then fall back to English
    const msg = resolve($locale, key) ?? resolve('en', key);
    if (msg) return interpolate(msg, params);

    // Missing key — report in development, return the key itself as last resort
    if (dev && !reportedMissingKeys.has(key)) {
      reportedMissingKeys.add(key);
      console.warn(`[i18n] Missing translation key: "${key}" (locale: ${$locale})`);
    }
    return key;
  };
});

/**
 * Pluralized translator store — use as $tp('namespace.key', count, { param: value }).
 *
 * The message value should use pipe-separated plural forms: "{count} run|{count} runs".
 * Forms map to CLDR categories: for 2 forms = one|other, for 6 = zero|one|two|few|many|other.
 */
export const tp = derived<typeof locale, PluralTranslator>(locale, ($locale) => {
  return (key: TranslationKey, count: number, params?: InterpolationParams): string => {
    const msg = resolve($locale, key) ?? resolve('en', key);
    if (msg) {
      const selected = selectPlural(msg, count, $locale);
      return interpolate(selected, { count, ...params });
    }

    if (dev && !reportedMissingKeys.has(key)) {
      reportedMissingKeys.add(key);
      console.warn(`[i18n] Missing translation key: "${key}" (locale: ${$locale})`);
    }
    return key;
  };
});

// ---------------------------------------------------------------------------
// Locale management
// ---------------------------------------------------------------------------

/** Change the active locale with persistence. Loads bundle on demand. */
export async function setLocale(newLocale: Locale): Promise<void> {
  await loadLocale(newLocale);
  locale.set(newLocale);
  if (browser) {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }
}

/**
 * Load a locale bundle at runtime (lazy dynamic import).
 * English is always pre-loaded; other locales are imported on demand.
 */
export async function loadLocale(loc: Locale): Promise<void> {
  // English is always pre-loaded via static import — skip dynamic import
  if (bundles.has(loc)) return;

  try {
    // Dynamic import — Vite will code-split each non-English locale into its own chunk.
    // English is excluded here because it's statically imported above.
    const loaders: Record<string, () => Promise<{ default: Record<string, Record<string, string>> }>> = {
      // Add new locale loaders here as locales are added:
      // 'de': () => import('./messages/de.ts'),
    };
    const loader = loaders[loc];
    if (!loader) throw new Error(`No loader for locale "${loc}"`);
    const module = await loader();
    bundles.set(loc, module.default);
    // Re-trigger the derived store so $t picks up the new bundle
    locale.update((v) => v);
  } catch {
    console.warn(`Locale "${loc}" bundle not found, falling back to English`);
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { Messages } from './messages/en';
export { default as en } from './messages/en';
