#!/usr/bin/env python3
"""
===============================================================================
 DataFlow Studio — Python Excel Engine Bridge (openpyxl 3.1.5)
===============================================================================
 Exact 1:1 algorithmic implementation of the DataFlow Excel Merger:
  - Deep Cell Style Cloning (font, fill, border, alignment, number formats, protection)
  - Column Width & Row Height dimension replication
  - Specialized Sheet Fusion:
      * 'Missing Files' (Vertical stacking with header preservation)
      * 'Folder Structure' (Horizontal column fusion preserving width & indent)
      * 'Camera Summary' (Total Found / Total Missing aggregation with conditional format)
      * Generic Tabular Sheets (Sequential row concatenation with merged range support)
  - File lock collision handling with timestamp suffix fallback
===============================================================================
"""

import os
import sys
import re
import json
import copy
from pathlib import Path
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def clean_excel_path(path_str):
    if not path_str:
        return ""
    s = str(path_str).replace("file:///", "").replace("file://", "").strip()
    if sys.platform == "win32" and s.startswith("/") and len(s) > 2 and s[2] == ":":
        s = s[1:]
    return os.path.normpath(s)


def copy_cell_style(src_cell, dst_cell):
    """Deep-copies all visual styling attributes from src_cell to dst_cell safely."""
    if not hasattr(src_cell, 'has_style') or not src_cell.has_style:
        return
    try:
        if src_cell.font:
            dst_cell.font = copy.copy(src_cell.font)
        if src_cell.fill:
            dst_cell.fill = copy.copy(src_cell.fill)
        if src_cell.border:
            dst_cell.border = copy.copy(src_cell.border)
        if src_cell.alignment:
            dst_cell.alignment = copy.copy(src_cell.alignment)
        if src_cell.number_format:
            dst_cell.number_format = src_cell.number_format
        if src_cell.protection:
            dst_cell.protection = copy.copy(src_cell.protection)
    except Exception:
        pass


def copy_col_dimensions(ws_src, ws_dst, src_col_idx, dst_col_idx):
    """Copies column width and hidden flag from source worksheet to destination worksheet."""
    try:
        src_letter = get_column_letter(src_col_idx)
        dst_letter = get_column_letter(dst_col_idx)
        if src_letter in ws_src.column_dimensions:
            src_dim = ws_src.column_dimensions[src_letter]
            if src_dim.width is not None:
                ws_dst.column_dimensions[dst_letter].width = src_dim.width
            if src_dim.hidden:
                ws_dst.column_dimensions[dst_letter].hidden = True
    except Exception:
        pass


def inspect_files(file_paths):
    """Returns metadata preview of files for the UI (size, sheet names, row count)."""
    results = []
    for fp_raw in file_paths:
        fp = clean_excel_path(fp_raw)
        if not fp or not os.path.isfile(fp):
            continue
        try:
            sz = os.path.getsize(fp)
            if sz >= 1048576:
                sz_str = f"{sz / 1048576:.1f} MB"
            elif sz >= 1024:
                sz_str = f"{sz / 1024:.0f} KB"
            else:
                sz_str = f"{sz} B"

            wb = openpyxl.load_workbook(fp, read_only=True)
            sheets = list(wb.sheetnames)
            row_count = 0
            if sheets:
                ws = wb[sheets[0]]
                row_count = ws.max_row or 0
            wb.close()

            results.append({
                "path": fp,
                "name": os.path.basename(fp),
                "size": sz_str,
                "sheets": sheets,
                "sheet_count": len(sheets),
                "rows": row_count,
                "valid": True
            })
        except Exception as ex:
            results.append({
                "path": fp,
                "name": os.path.basename(fp),
                "size": "Error",
                "sheets": [],
                "sheet_count": 0,
                "rows": 0,
                "valid": False,
                "error": str(ex)
            })
    return results


def scan_directory(folder_path):
    """Scans folder for all .xlsx files excluding temp ~$ files and previous MERGED files."""
    clean_dir = clean_excel_path(folder_path)
    p = Path(clean_dir)
    if not p.is_dir():
        return []
    xlsx_files = []
    for f in sorted(p.glob("*.xlsx")):
        if not f.name.startswith("~$") and "MERGED" not in f.name.upper():
            xlsx_files.append(str(f))
    return xlsx_files


def merge_inventory_reports(file_paths, output_path=None):
    """
    Merges multiple Excel inventory report files into a single workbook with full style fidelity,
    supporting standard DataFlow inventory formats as well as generic workbooks.
    """
    if not file_paths or len(file_paths) < 1:
        raise ValueError("At least one Excel file path must be provided for merging.")

    cleaned_paths = [clean_excel_path(f) for f in file_paths if f]
    valid_files = [f for f in cleaned_paths if os.path.isfile(f) and f.lower().endswith(('.xlsx', '.xlsm'))]
    if not valid_files:
        raise FileNotFoundError(f"No valid Excel (.xlsx/.xlsm) files found in: {file_paths}")

    if not output_path:
        # When 2 files provided (Photo + Video inventory), save in the 2nd file's directory
        # so the merged report lands next to the Video Inventory file.
        if len(valid_files) >= 2:
            output_dir = os.path.dirname(os.path.abspath(valid_files[1]))
            second_stem = Path(valid_files[1]).stem
        else:
            output_dir = os.path.dirname(os.path.abspath(valid_files[0]))
            second_stem = Path(valid_files[0]).stem

        # Derive shared base name — strip _01M / _02E / photo / video type suffixes
        clean_prefix = re.sub(
            r'(_01M|_02E|_Photo|_Video|_photo|_video)?(_Inventory_Report.*)?$',
            '',
            second_stem,
            flags=re.IGNORECASE
        ).rstrip(' _')
        if not clean_prefix:
            clean_prefix = second_stem

        merged_filename = f"{clean_prefix}_Inventory_Report_MERGED.xlsx"
        output_path = os.path.join(output_dir, merged_filename)
    else:
        output_path = clean_excel_path(output_path)

    loaded_wbs = []
    for fp in valid_files:
        try:
            wb = openpyxl.load_workbook(fp, data_only=False)
            loaded_wbs.append((fp, wb))
        except Exception:
            wb = openpyxl.load_workbook(fp)
            loaded_wbs.append((fp, wb))

    wb_out = openpyxl.Workbook()
    if wb_out.sheetnames:
        wb_out.remove(wb_out.active)

    sheet_order = []
    for _, wb in loaded_wbs:
        for sname in wb.sheetnames:
            if sname not in sheet_order:
                sheet_order.append(sname)

    stats = {
        "files_merged": len(valid_files),
        "sheets_processed": 0,
        "total_rows_merged": 0,
        "missing_files_count": 0,
        "folder_columns_count": 0,
        "camera_summary_found": 0,
        "camera_summary_missing": 0,
        "issues_count": 0,
        "output_path": output_path
    }

    for sname in sheet_order:
        ws_out = wb_out.create_sheet(title=sname)
        if hasattr(ws_out, 'views') and ws_out.views and ws_out.views.sheetView:
            ws_out.views.sheetView[0].showGridLines = True

        worksheets_for_this_sheet = []
        for fp, wb in loaded_wbs:
            if sname in wb.sheetnames:
                worksheets_for_this_sheet.append((fp, wb[sname]))

        if not worksheets_for_this_sheet:
            continue

        first_fp, first_ws = worksheets_for_this_sheet[0]
        stats["sheets_processed"] += 1

        # 1. Special Sheet: Missing Files
        if sname.strip().lower() == 'missing files':
            for c in range(1, first_ws.max_column + 1):
                c_src = first_ws.cell(1, c)
                c_dst = ws_out.cell(1, c, value=c_src.value)
                copy_cell_style(c_src, c_dst)
                copy_col_dimensions(first_ws, ws_out, c, c)
            if 1 in first_ws.row_dimensions and first_ws.row_dimensions[1].height:
                ws_out.row_dimensions[1].height = first_ws.row_dimensions[1].height

            cur_row = 2
            for fp, ws in worksheets_for_this_sheet:
                for r in range(2, ws.max_row + 1):
                    row_vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
                    if any(v is not None for v in row_vals):
                        for c in range(1, ws.max_column + 1):
                            src_c = ws.cell(r, c)
                            dst_c = ws_out.cell(cur_row, c, value=src_c.value)
                            copy_cell_style(src_c, dst_c)
                        if r in ws.row_dimensions and ws.row_dimensions[r].height:
                            ws_out.row_dimensions[cur_row].height = ws.row_dimensions[r].height
                        cur_row += 1
                        stats["missing_files_count"] += 1
                        stats["total_rows_merged"] += 1

        # 2. Special Sheet: Folder Structure
        elif sname.strip().lower() == 'folder structure':
            cur_dst_col = 1
            for fp, ws in worksheets_for_this_sheet:
                for c in range(1, ws.max_column + 1):
                    col_vals = [ws.cell(r, c).value for r in range(1, ws.max_row + 1)]
                    if any(v is not None for v in col_vals):
                        copy_col_dimensions(ws, ws_out, c, cur_dst_col)
                        for r in range(1, ws.max_row + 1):
                            src_c = ws.cell(r, c)
                            if src_c.value is not None or (hasattr(src_c, 'has_style') and src_c.has_style):
                                dst_c = ws_out.cell(r, cur_dst_col, value=src_c.value)
                                copy_cell_style(src_c, dst_c)
                            if r in ws.row_dimensions and ws.row_dimensions[r].height:
                                ws_out.row_dimensions[r].height = ws.row_dimensions[r].height
                        cur_dst_col += 1
                        stats["folder_columns_count"] += 1

        # 3. Special Sheet: Camera Summary
        elif sname.strip().lower() == 'camera summary':
            cameras = {}
            for fp, ws in worksheets_for_this_sheet:
                current_cam = None
                for r in range(1, ws.max_row + 1):
                    cell = ws.cell(r, 1)
                    val = str(cell.value or '').strip()
                    if not val:
                        continue

                    if re.match(r'^Cam\s*\d+', val, re.IGNORECASE) or val.startswith('Cam '):
                        current_cam = val
                        if current_cam not in cameras:
                            cameras[current_cam] = {
                                'items': [],
                                'total_found': 0,
                                'total_missing': 0,
                                'header_cell': cell,
                                'found_cell': None,
                                'missing_cell': None
                            }
                    elif val.startswith('Total Found:'):
                        m = re.search(r'Total Found:\s*(\d+)', val)
                        if m and current_cam:
                            cameras[current_cam]['total_found'] += int(m.group(1))
                            cameras[current_cam]['found_cell'] = cell
                    elif val.startswith('Total Missing:'):
                        m = re.search(r'Total Missing:\s*(\d+)', val)
                        if m and current_cam:
                            cameras[current_cam]['total_missing'] += int(m.group(1))
                            cameras[current_cam]['missing_cell'] = cell
                    else:
                        if current_cam:
                            cameras[current_cam]['items'].append((cell.value, cell))
                        else:
                            generic_cam = "Cam Summary"
                            if generic_cam not in cameras:
                                cameras[generic_cam] = {
                                    'items': [],
                                    'total_found': 0,
                                    'total_missing': 0,
                                    'header_cell': cell,
                                    'found_cell': None,
                                    'missing_cell': None
                                }
                            cameras[generic_cam]['items'].append((cell.value, cell))

            copy_col_dimensions(first_ws, ws_out, 1, 1)
            if ws_out.column_dimensions['A'].width is None:
                ws_out.column_dimensions['A'].width = 24.0

            cur_row = 1
            for cam_name, data in cameras.items():
                c_hdr = ws_out.cell(cur_row, 1, value=cam_name)
                copy_cell_style(data['header_cell'], c_hdr)
                cur_row += 1

                for val, src_cell in data['items']:
                    c_itm = ws_out.cell(cur_row, 1, value=val)
                    copy_cell_style(src_cell, c_itm)
                    cur_row += 1

                c_fnd = ws_out.cell(cur_row, 1, value=f"Total Found: {data['total_found']}")
                if data['found_cell']:
                    copy_cell_style(data['found_cell'], c_fnd)
                else:
                    c_fnd.font = Font(name="Segoe UI", size=11, bold=True)
                cur_row += 1

                c_mis = ws_out.cell(cur_row, 1, value=f"Total Missing: {data['total_missing']}")
                if data['missing_cell']:
                    copy_cell_style(data['missing_cell'], c_mis)
                    if data['total_missing'] == 0:
                        c_mis.fill = PatternFill(fill_type=None)
                else:
                    c_mis.font = Font(name="Segoe UI", size=11, bold=True)
                    if data['total_missing'] > 0:
                        c_mis.fill = PatternFill(start_color="FFFFC7CE", end_color="FFFFC7CE", fill_type="solid")
                cur_row += 2

                stats["camera_summary_found"] += data['total_found']
                stats["camera_summary_missing"] += data['total_missing']

        # 4. Standard / Generic Tabular Sheets & Multi-Workbook Sheets
        else:
            for c in range(1, first_ws.max_column + 1):
                copy_col_dimensions(first_ws, ws_out, c, c)

            if len(worksheets_for_this_sheet) == 1:
                ws = first_ws
                for r in range(1, ws.max_row + 1):
                    if r in ws.row_dimensions and ws.row_dimensions[r].height:
                        ws_out.row_dimensions[r].height = ws.row_dimensions[r].height
                    for c in range(1, ws.max_column + 1):
                        src_c = ws.cell(r, c)
                        dst_c = ws_out.cell(r, c, value=src_c.value)
                        copy_cell_style(src_c, dst_c)
                for rng in ws.merged_cells.ranges:
                    try:
                        ws_out.merge_cells(str(rng))
                    except Exception:
                        pass
                stats["total_rows_merged"] += ws.max_row
            else:
                for c in range(1, first_ws.max_column + 1):
                    c_src = first_ws.cell(1, c)
                    c_dst = ws_out.cell(1, c, value=c_src.value)
                    copy_cell_style(c_src, c_dst)
                if 1 in first_ws.row_dimensions and first_ws.row_dimensions[1].height:
                    ws_out.row_dimensions[1].height = first_ws.row_dimensions[1].height

                cur_row = 2
                for fp_idx, (fp, ws) in enumerate(worksheets_for_this_sheet):
                    start_r = 2 if ws.max_row > 1 else 1
                    for r in range(start_r, ws.max_row + 1):
                        row_vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
                        if any(v is not None for v in row_vals):
                            for c in range(1, ws.max_column + 1):
                                src_c = ws.cell(r, c)
                                dst_c = ws_out.cell(cur_row, c, value=src_c.value)
                                copy_cell_style(src_c, dst_c)
                            if r in ws.row_dimensions and ws.row_dimensions[r].height:
                                ws_out.row_dimensions[cur_row].height = ws.row_dimensions[r].height
                            cur_row += 1
                            stats["total_rows_merged"] += 1
                            if sname.strip().lower() == 'issues':
                                stats["issues_count"] += 1

    target_save_path = output_path
    os.makedirs(os.path.dirname(os.path.abspath(target_save_path)), exist_ok=True)
    try:
        wb_out.save(target_save_path)
    except PermissionError:
        stem, ext = os.path.splitext(output_path)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        target_save_path = f"{stem}_{timestamp_str}{ext}"
        wb_out.save(target_save_path)
        stats["output_path"] = target_save_path

    return stats


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]

    # Support reading data from stdin if sys.argv[2] is "-" or not provided
    input_payload = ""
    if len(sys.argv) > 2 and sys.argv[2] != "-":
        input_payload = sys.argv[2]
    else:
        input_payload = sys.stdin.read()

    try:
        if action == "inspect":
            files = json.loads(input_payload.strip() or "[]")
            res = inspect_files(files)
            print(json.dumps({"success": True, "data": res}))

        elif action == "scan":
            folder = input_payload.strip() if input_payload else (sys.argv[2] if len(sys.argv) > 2 else "")
            res = scan_directory(folder)
            print(json.dumps({"success": True, "files": res}))

        elif action == "merge":
            args = json.loads(input_payload.strip() or "{}")
            files = args.get("files", [])
            out = args.get("output_path", "")
            stats = merge_inventory_reports(files, out or None)
            print(json.dumps({"success": True, "stats": stats}))

        else:
            print(json.dumps({"error": f"Unknown action: {action}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
