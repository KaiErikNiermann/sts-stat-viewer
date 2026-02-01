set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# List recipes
default:
  @just --list

# Bump version, sync Tauri/Cargo, commit, tag, push, and create GitHub release
release bump="patch":
  pnpm version {{bump}} --no-git-tag-version
  @version=$(node -p "require('./package.json').version"); \
    just _sync_native_versions "$version"; \
    just _release "$version"

# Set an explicit version, sync Tauri/Cargo, then release
release-version version:
  @current=$(node -p "require('./package.json').version"); \
    if [ "$current" != "{{version}}" ]; then \
      pnpm version {{version}} --no-git-tag-version; \
    fi; \
    just _sync_native_versions "{{version}}"; \
    just _release "{{version}}"

# Re-trigger publish for an existing version by re-tagging HEAD
rerun version:
  git push
  git tag -d v{{version}} || true
  git push --delete origin v{{version}} || true
  git tag v{{version}}
  git push origin v{{version}}

# Delete and recreate the GitHub release + retag HEAD at the same version
rerelease version:
  gh release delete v{{version}} -y || true
  just rerun {{version}}
  gh release create v{{version}} --title "v{{version}}" --generate-notes

# Internal helper
_release version:
  git add package.json pnpm-lock.yaml src-tauri/tauri.conf.json src-tauri/Cargo.toml
  git commit -m "chore(release): v{{version}}"
  git push
  git tag v{{version}}
  git push origin v{{version}}
  gh release create v{{version}} --title "v{{version}}" --generate-notes

# Keep Tauri and Cargo versions in sync with package.json
_sync_native_versions version:
  node -e "const fs=require('fs');const v=process.argv[1];const p='src-tauri/tauri.conf.json';const d=JSON.parse(fs.readFileSync(p,'utf8'));d.version=v;fs.writeFileSync(p, JSON.stringify(d,null,2)+'\\n');" "{{version}}"
  node -e "const fs=require('fs');const v=process.argv[1];const p='src-tauri/Cargo.toml';let t=fs.readFileSync(p,'utf8');const re=/^version = \".*\"$/m;if(!re.test(t)){console.error('Could not find package version in Cargo.toml');process.exit(1);}t=t.replace(re, `version = \\\"${v}\\\"`);fs.writeFileSync(p,t);" "{{version}}"
