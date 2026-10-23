import sys
import os

# Delegate directly to root script
root_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "collect_inventory_reports.py")
if os.path.exists(root_script):
    with open(root_script, "r", encoding="utf-8") as f:
        code = f.read()
    exec(compile(code, root_script, 'exec'))
else:
    print("Main collect_inventory_reports.py not found.")
