# i18n CI Gates

## Overview

The CI pipeline includes automated validation to catch localization regressions before merge and before release.

## PR Test Workflow (`test.yml`)

### Path Triggers

The i18n validation job runs when any of these paths change:
- `src/**` (includes `src/lib/i18n/**`)
- `scripts/i18n/**`
- `docs/i18n/**`

### `i18n-validate` Job

Runs `pnpm i18n:validate` which performs 7 checks:

| Check | Description | Severity |
|-------|-------------|----------|
| 1. English structure | Required namespaces exist, no empty values | FAIL |
| 2. Placeholder integrity | Valid `{placeholder}` syntax | FAIL |
| 3. Key parity | All English keys present in every locale | FAIL |
| 4. Metadata schema | Valid status, locale field, review coverage | FAIL |
| 5. Key usage audit | Defined keys used in source; used keys defined | WARN/FAIL |
| 6. Canonical term lock | Game terms match canonical glossary | FAIL |
| 7. Translation completeness | Coverage report per locale | INFO |

### Enforcement Rules

- `human_verified` status requires `human_review_coverage: 100`
- `human_verified` status requires `reviewed_by` and `reviewed_at` fields
- Placeholder mismatches between English and locale files are failures

## Release Workflow (`release.yml`)

### Pre-Release Validation

Before creating a release:
1. `pnpm i18n:validate` runs and must pass (blocks release on failure)
2. Locale status summary is generated and appended to release notes

### Release Notes

Each release includes a "Locale Status" section listing:
- Locale code
- Verification status (`source`, `human_verified`, `ai_unverified`)
- Human review coverage percentage

## Translation Generation Workflow (`translate.yml`)

### Access Control

- **Trigger**: Manual `workflow_dispatch` only
- **Repository**: Only runs on the base repo (never forks)
- **Concurrency**: Prevents concurrent translation runs
- **Secrets**: `DEEPL_API_KEY` required

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `locales` | BCP-47 codes or "all" | `all` |
| `namespace` | Specific namespace | all |
| `formality` | DeepL formality level | `default` |
| `dry_run` | No API calls or writes | `false` |

### Artifacts

After generation, a `translation-diff` artifact is uploaded containing:
- Diff summary (changed files and line counts)
- Generated message files
- Generated metadata files

Artifacts are retained for 30 days for reviewer inspection.
