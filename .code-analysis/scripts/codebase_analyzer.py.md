# Mirror: `scripts/codebase_analyzer.py`

- **Hash:** `e23fb2af295c3d0f...`
- **Lines:** 141
- **Estimated Tokens:** ~1,435

### Key Exports / Symbols:
```
def compute_sha256(file_path: Path) -> str:
def extract_metadata(file_path: Path, content: str) -> dict:
exports = [l.strip() for l in lines if 'export ' in l or 'def ' in l or 'class ' in l][:8]
def main():
```
