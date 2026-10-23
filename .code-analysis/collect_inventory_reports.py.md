# Mirror: `collect_inventory_reports.py`

- **Hash:** `b785cd32ff5e5c8a...`
- **Lines:** 683
- **Estimated Tokens:** ~6,902

### Key Exports / Symbols:
```
def clean_path(path_str: str) -> str:
def format_bytes(bytes_count: int) -> str:
class InventoryReportCollector:
def __init__(self, source_dir: str, dest_dir: str, smart_prefix: bool = True):
def is_target_file(self, filename: str) -> bool:
def is_in_document_folder(self, dir_path: str) -> Tuple[bool, str]:
def get_parent_shoot_folder(self, file_path: str) -> str:
def scan(self) -> List[Dict]:
```
