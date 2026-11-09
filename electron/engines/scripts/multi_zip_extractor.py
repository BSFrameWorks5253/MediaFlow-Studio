#!/usr/bin/env python3
"""
Multi-Part Zip & Google Drive Archive Extractor Engine
Consolidates multi-volume / split Google Drive archives (001, 002, 003...)
into a single unified folder structure without duplicate nesting.
"""

import sys
import os
import re
import json
import zipfile
import time
import argparse

def emit(data):
    print(json.dumps(data), flush=True)

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def scan_zip_files(zip_paths):
    """
    Scans a list of zip files and returns metadata about files and total uncompressed bytes.
    """
    total_files = 0
    total_bytes = 0
    items = []

    for zp in zip_paths:
        if not os.path.isfile(zp):
            continue
        try:
            with zipfile.ZipFile(zp, 'r') as zf:
                infolist = zf.infolist()
                file_count = sum(1 for info in infolist if not info.is_dir())
                uncompressed_bytes = sum(info.file_size for info in infolist if not info.is_dir())
                total_files += file_count
                total_bytes += uncompressed_bytes
                items.append({
                    "path": zp,
                    "filename": os.path.basename(zp),
                    "file_count": file_count,
                    "uncompressed_bytes": uncompressed_bytes,
                    "size_bytes": os.path.getsize(zp)
                })
        except Exception as e:
            items.append({
                "path": zp,
                "filename": os.path.basename(zp),
                "error": str(e),
                "file_count": 0,
                "uncompressed_bytes": 0,
                "size_bytes": 0
            })

    return {
        "zips": items,
        "total_files": total_files,
        "total_uncompressed_bytes": total_bytes
    }

def detect_outer_folder_prefix(zip_paths):
    """
    Checks if all zips wrap contents in a single identical top-level root folder
    (e.g., 'drive-download-20261109T...' or 'Folder_Name/').
    """
    root_names = set()
    sample_files_checked = 0

    for zp in zip_paths:
        if not os.path.isfile(zp):
            continue
        try:
            with zipfile.ZipFile(zp, 'r') as zf:
                for name in zf.namelist():
                    parts = name.strip('/').split('/')
                    if len(parts) > 1:
                        root_names.add(parts[0])
                        sample_files_checked += 1
                        if sample_files_checked > 20:
                            break
        except Exception:
            pass

    # If all inspected files share exactly one top-level container, return it
    if len(root_names) == 1:
        return list(root_names)[0]
    return None

def extract_multi_zip(zip_paths, output_dir, flatten_outer=False):
    os.makedirs(output_dir, exist_ok=True)
    
    # Sort files naturally so -001.zip, -002.zip, -003.zip are processed in strict order
    sorted_zips = sorted(zip_paths, key=natural_sort_key)
    
    # Scan totals first
    scan_info = scan_zip_files(sorted_zips)
    total_files = scan_info["total_files"]
    total_bytes = scan_info["total_uncompressed_bytes"]
    
    outer_folder = detect_outer_folder_prefix(sorted_zips) if flatten_outer else None

    extracted_files = 0
    extracted_bytes = 0
    start_time = time.time()
    last_emit_time = 0

    emit({
        "type": "start",
        "total_zips": len(sorted_zips),
        "total_files": total_files,
        "total_bytes": total_bytes,
        "output_dir": output_dir,
        "outer_folder_detected": outer_folder
    })

    for zip_idx, zp in enumerate(sorted_zips):
        if not os.path.isfile(zp):
            continue

        zip_basename = os.path.basename(zp)
        emit({
            "type": "zip_start",
            "zip_index": zip_idx + 1,
            "total_zips": len(sorted_zips),
            "zip_name": zip_basename
        })

        try:
            with zipfile.ZipFile(zp, 'r') as zf:
                for info in zf.infolist():
                    # Skip pure directory entries
                    if info.is_dir():
                        continue

                    arcname = info.filename
                    
                    # Normalize slashes
                    arcname_norm = arcname.replace('\\', '/').lstrip('/')
                    
                    # If flattening outer single root
                    if outer_folder and arcname_norm.startswith(outer_folder + '/'):
                        target_subpath = arcname_norm[len(outer_folder) + 1:]
                    else:
                        target_subpath = arcname_norm

                    target_path = os.path.join(output_dir, *target_subpath.split('/'))
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)

                    # Extract file stream
                    with zf.open(info) as src, open(target_path, 'wb') as dst:
                        while True:
                            chunk = src.read(1024 * 512) # 512KB chunks
                            if not chunk:
                                break
                            dst.write(chunk)
                            extracted_bytes += len(chunk)

                    extracted_files += 1

                    # Throttle progress events to max 10 per second
                    now = time.time()
                    if now - last_emit_time >= 0.1 or extracted_files == total_files:
                        last_emit_time = now
                        pct = (extracted_bytes / total_bytes * 100) if total_bytes > 0 else 0
                        speed = extracted_bytes / max(1, now - start_time)
                        emit({
                            "type": "progress",
                            "file": os.path.basename(target_path),
                            "extracted_files": extracted_files,
                            "total_files": total_files,
                            "extracted_bytes": extracted_bytes,
                            "total_bytes": total_bytes,
                            "percent": round(pct, 1),
                            "current_zip": zip_basename,
                            "speed_mbps": round(speed / (1024 * 1024), 2)
                        })

        except Exception as e:
            emit({
                "type": "zip_error",
                "zip_name": zip_basename,
                "error": str(e)
            })

    elapsed = time.time() - start_time
    emit({
        "type": "done",
        "success": True,
        "output_dir": output_dir,
        "files_extracted": extracted_files,
        "total_bytes": extracted_bytes,
        "elapsed_seconds": round(elapsed, 2),
        "zips_processed": [os.path.basename(p) for p in sorted_zips]
    })

def main():
    parser = argparse.ArgumentParser(description="Multi-Part Zip Extractor")
    parser.add_argument("--action", choices=["scan", "extract"], default="extract")
    parser.add_argument("--zips", nargs="+", help="Paths to zip files")
    parser.add_argument("--output-dir", help="Output directory for extraction")
    parser.add_argument("--flatten-outer", action="store_true", help="Flatten single outer folder if detected")

    args = parser.parse_args()

    if not args.zips:
        emit({"type": "error", "message": "No zip files specified."})
        sys.exit(1)

    if args.action == "scan":
        res = scan_zip_files(args.zips)
        emit({"type": "scan_result", "data": res})
    else:
        if not args.output_dir:
            emit({"type": "error", "message": "Output directory is required for extraction."})
            sys.exit(1)
        extract_multi_zip(args.zips, args.output_dir, args.flatten_outer)

if __name__ == "__main__":
    main()
