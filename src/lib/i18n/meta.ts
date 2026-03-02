/**
 * Locale provenance metadata — tracks translation origin and verification status.
 *
 * Each supported locale has a corresponding JSON file in `meta/<locale>.json`.
 * English is always `source`; non-English locales start as `ai_unverified`
 * and progress to `human_verified` only after a full review pass.
 */

import type { LocaleStatus } from './index';

export interface LocaleHistoryEntry {
  readonly action: string;
  readonly status: string;
  readonly by: string;
  readonly at: string;
  readonly notes: string;
}

export interface LocaleMeta {
  readonly locale: string;
  readonly status: LocaleStatus;
  /** Percentage of keys reviewed by a human (0–100). */
  readonly human_review_coverage: number;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  /** Tool/model that generated the translations (null for source locale). */
  readonly generated_by: string | null;
  readonly generated_at: string | null;
  readonly notes: string | null;
  /** Immutable audit trail of status transitions. */
  readonly history?: readonly LocaleHistoryEntry[];
}

/** Import all locale meta files eagerly (small JSON, always needed for locale picker). */
const metaModules = import.meta.glob<LocaleMeta>('./meta/*.json', { eager: true, import: 'default' });

const metaMap = new Map<string, LocaleMeta>();
for (const [path, meta] of Object.entries(metaModules)) {
  // path is like './meta/en.json' -> extract 'en'
  const code = path.replace('./meta/', '').replace('.json', '');
  metaMap.set(code, meta);
}

/** Get provenance metadata for a locale. */
export function getLocaleMeta(locale: string): LocaleMeta | undefined {
  return metaMap.get(locale);
}

/** Get all loaded locale metadata. */
export function getAllLocaleMeta(): ReadonlyMap<string, LocaleMeta> {
  return metaMap;
}
