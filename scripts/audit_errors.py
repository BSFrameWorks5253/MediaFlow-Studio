import os
import re

root_dirs = ['src', 'electron']
findings = []

pattern = re.compile(
    r'(\$\{(?:e|err|error)\.(?:message|stack|toString\(\))\})|'
    r'(\$\{(?:e|err|error)\})|'
    r'((?:toast|onShowToast|showToast)\([^,]*\$\{(?:e|err|error))|'
    r'((?:alert|setError|status:)\s*[`\'"].*\$\{(?:e|err|error))|'
    r'((?:reject|throw)\s*\(?\s*new\s+Error\([^)]*\$\{(?:stdout|stderr|err|error))|'
    r'(throw\s+new\s+Error\(`[^`]*\$\{(?:dir|path|clean|source|dest|folder|target))',
    re.IGNORECASE
)

for r_dir in root_dirs:
    for root, dirs, files in os.walk(r_dir):
        for f in files:
            if not f.endswith(('.ts', '.tsx')):
                continue
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp, 1):
                    line_s = line.strip()
                    if pattern.search(line_s):
                        findings.append((p, idx, line_s))

print(f"TOTAL_FINDINGS: {len(findings)}")
for p, idx, l in findings:
    print(f"{p}:{idx} -> {l}")
