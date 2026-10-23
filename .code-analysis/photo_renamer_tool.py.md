# Mirror: `photo_renamer_tool.py`

- **Hash:** `70c043bc488ff211...`
- **Lines:** 786
- **Estimated Tokens:** ~8,825

### Key Exports / Symbols:
```
class PhotoMatcherEngine:
def __init__(
def is_ignored(self, filename: str) -> bool:
def clean_stem(filename: str) -> str:
def get_subfolders(self, folder: Path) -> List[Path]:
def pair_folders(self) -> List[Tuple[Optional[Path], Optional[Path], str]]:
def scan(self) -> Dict:
def execute_rename(self, plan_items: List[Dict], dry_run: bool = False) -> Dict:
```
