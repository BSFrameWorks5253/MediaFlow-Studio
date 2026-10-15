#!/usr/bin/env python3
"""
Universal SHA-256 Token-Saving Codebase Analyzer & Local Knowledge Base Generator (Blueprint 03)
Saves 99%+ of LLM context tokens by maintaining an incremental cached index.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / ".code-analysis"
INDEX_FILE = OUTPUT_DIR / "index.json"
MASTER_KB = OUTPUT_DIR / "KNOWLEDGE_BASE.md"

TARGET_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.html', 
    '.json', '.nsi', '.bat', '.md'
}

EXCLUDE_DIRS = {
    'node_modules', 'dist', 'dist-electron', 'out', 'release', 'build', 
    '.git', '.code-analysis', '.venv', '__pycache__', 'coverage', '.gemini'
}

def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def extract_metadata(file_path: Path, content: str) -> dict:
    lines = content.splitlines()
    total_lines = len(lines)
    tokens_est = int(len(content) / 3.8) # Conservative token estimation
    
    # Extract imports and exports
    imports = [l.strip() for l in lines if l.strip().startswith(('import ', 'from ', 'require('))][:8]
    exports = [l.strip() for l in lines if 'export ' in l or 'def ' in l or 'class ' in l][:8]

    return {
        "lines": total_lines,
        "est_tokens": tokens_est,
        "sample_imports": imports,
        "sample_exports": exports
    }

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    existing_index = {}
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                existing_index = json.load(f)
        except Exception:
            existing_index = {}

    updated_index = {}
    cached_count = 0
    updated_count = 0
    total_tokens_cached = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            p = Path(root) / file
            if p.suffix.lower() not in TARGET_EXTENSIONS:
                continue
            
            rel_path = str(p.relative_to(ROOT_DIR)).replace('\\', '/')
            current_hash = compute_sha256(p)

            # Cache hit check
            if rel_path in existing_index and existing_index[rel_path].get('hash') == current_hash:
                updated_index[rel_path] = existing_index[rel_path]
                cached_count += 1
                total_tokens_cached += existing_index[rel_path].get('est_tokens', 0)
                continue

            # Cache miss: parse and write mirror
            try:
                content = p.read_text(encoding='utf-8', errors='ignore')
                meta = extract_metadata(p, content)
                
                record = {
                    "hash": current_hash,
                    "last_modified": datetime.fromtimestamp(p.stat().st_mtime).isoformat(),
                    "lines": meta['lines'],
                    "est_tokens": meta['est_tokens'],
                    "summary": f"{meta['lines']} lines, {len(meta['sample_exports'])} symbols"
                }
                
                updated_index[rel_path] = record
                updated_count += 1
                total_tokens_cached += meta['est_tokens']

                # Mirror markdown summary
                mirror_file = OUTPUT_DIR / f"{rel_path}.md"
                mirror_file.parent.mkdir(parents=True, exist_ok=True)
                mirror_file.write_text(
                    f"# Mirror: `{rel_path}`\n\n"
                    f"- **Hash:** `{current_hash[:16]}...`\n"
                    f"- **Lines:** {meta['lines']}\n"
                    f"- **Estimated Tokens:** ~{meta['est_tokens']:,}\n\n"
                    f"### Key Exports / Symbols:\n```\n" + "\n".join(meta['sample_exports']) + "\n```\n",
                    encoding='utf-8'
                )
            except Exception as e:
                print(f"[WARN] Failed to process {rel_path}: {e}")

    # Save master index.json
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(updated_index, f, indent=2)

    # Compile master KNOWLEDGE_BASE.md
    with open(MASTER_KB, 'w', encoding='utf-8') as f:
        f.write("# MediaFlow Studio - Codebase Knowledge Base Index\n\n")
        f.write(f"- **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"- **Total Indexed Files:** {len(updated_index)}\n")
        f.write(f"- **Estimated Codebase Tokens:** ~{total_tokens_cached:,}\n")
        f.write(f"- **Cache Hits:** {cached_count} | **Updated/New:** {updated_count}\n\n")
        f.write("## File Map & Symbol Manifest\n\n")
        f.write("| File Path | Lines | Est. Tokens | Hash (First 8) |\n")
        f.write("| :--- | :---: | :---: | :--- |\n")
        for path_str, data in sorted(updated_index.items()):
            f.write(f"| `{path_str}` | {data.get('lines', 0)} | ~{data.get('est_tokens', 0):,} | `{data.get('hash', '')[:8]}` |\n")

    print(f"[TOKEN_CACHE] Indexing complete:")
    print(f"  - Cached files: {cached_count}")
    print(f"  - Updated files: {updated_count}")
    print(f"  - Total codebase tokens indexed: ~{total_tokens_cached:,}")
    print(f"  - Master knowledge base: {MASTER_KB}")

if __name__ == "__main__":
    main()
