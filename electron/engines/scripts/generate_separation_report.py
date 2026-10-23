#!/usr/bin/env python3
"""
DataFlow Studio — Separation Manifest Excel Generator (openpyxl)
Creates a styled Excel workbook (.xlsx) detailing separated files.
"""

import os
import sys
import json
from datetime import datetime

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


def format_bytes(b):
    if b >= 1024 ** 3:
        return f"{b / (1024 ** 3):.2f} GB"
    if b >= 1024 ** 2:
        return f"{b / (1024 ** 2):.2f} MB"
    if b >= 1024:
        return f"{b / 1024:.2f} KB"
    return f"{b} B"


def generate_excel_report(data, output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    summary = data.get("summary", {})
    items = data.get("items", [])

    if not HAS_OPENPYXL:
        # Fallback to CSV if openpyxl not available
        csv_path = os.path.splitext(output_path)[0] + ".csv"
        import csv
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["Index", "File Name", "Category", "Subfolder / Relative Path", "Size", "Size (Bytes)", "Source Path", "Destination Path", "Action", "Status"])
            for idx, item in enumerate(items, start=1):
                writer.writerow([
                    idx,
                    item.get("filename", ""),
                    item.get("category", "").upper(),
                    item.get("relPath", ""),
                    format_bytes(item.get("size", 0)),
                    item.get("size", 0),
                    item.get("sourcePath", ""),
                    item.get("targetPath", ""),
                    summary.get("transferMethod", "move").upper(),
                    item.get("status", "Success")
                ])
        return csv_path

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Separation Manifest"
    ws.views.sheetView[0].showGridLines = True

    # Palette
    NAVY_FILL = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    ACCENT_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    CARD_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    ZEBRA_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    SUCCESS_FILL = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")

    FONT_TITLE = Font(name="Segoe UI", size=15, bold=True, color="FFFFFF")
    FONT_SUBTITLE = Font(name="Segoe UI", size=10, italic=True, color="94A3B8")
    FONT_CARD_TITLE = Font(name="Segoe UI", size=9, bold=True, color="64748B")
    FONT_CARD_VAL = Font(name="Segoe UI", size=13, bold=True, color="0F172A")
    FONT_TH = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    FONT_DATA = Font(name="Segoe UI", size=10, color="1E293B")
    FONT_DATA_BOLD = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    FONT_SUCCESS = Font(name="Segoe UI", size=9.5, bold=True, color="15803D")

    BORDER_THIN = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
    ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
    ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")

    is_delete_mode = summary.get("transferMethod", "move").lower() == "delete"

    # Row 1-2: Banner
    ws.merge_cells("A1:I1")
    ws["A1"] = "DATAFLOW STUDIO — MASTER DATA PURGE & DELETION AUDIT" if is_delete_mode else "DATAFLOW STUDIO — MEDIA SEPARATION AUDIT MANIFEST"
    ws["A1"].font = FONT_TITLE
    ws["A1"].fill = NAVY_FILL
    ws["A1"].alignment = ALIGN_CENTER
    ws.row_dimensions[1].height = 36

    ws.merge_cells("A2:I2")
    if is_delete_mode:
        ws["A2"] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  •  Mode: {summary.get('target', 'video').upper()} PURGE FROM MASTER DATA"
    else:
        ws["A2"] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  •  Mode: {summary.get('target', 'video').upper()} SEPARATION ({summary.get('transferMethod', 'move').upper()})"
    ws["A2"].font = FONT_SUBTITLE
    ws["A2"].fill = ACCENT_FILL
    ws["A2"].alignment = ALIGN_CENTER
    ws.row_dimensions[2].height = 20

    # Row 3: Blank separator
    ws.row_dimensions[3].height = 10

    # Row 4-5: KPI Summary Cards
    cards = [
        ("Total Files", f"{summary.get('totalFiles', len(items)):,} Files", "A4:B5"),
        ("Total Size", format_bytes(summary.get("totalBytes", 0)), "C4:D5"),
        ("Avg Speed", f"{summary.get('avgSpeed', 0)} MB/s", "E4:F5"),
        ("Source Folder", summary.get("sourceDir", ""), "G4:G5"),
        ("Audit / Target Folder" if is_delete_mode else "Destination Folder", summary.get("destDir", ""), "H4:I5"),
    ]

    for label, val, range_str in cards:
        ws.merge_cells(range_str)
        top_cell = range_str.split(":")[0]
        ws[top_cell] = f"{label.upper()}\n{val}"
        ws[top_cell].font = FONT_CARD_VAL
        ws[top_cell].fill = CARD_FILL
        ws[top_cell].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        # Apply borders across range
        cells = ws[range_str]
        for row in cells:
            for c in row:
                c.border = BORDER_THIN

    ws.row_dimensions[4].height = 24
    ws.row_dimensions[5].height = 24

    # Row 6: Blank separator
    ws.row_dimensions[6].height = 12

    # Row 7: Table Headers
    headers = [
        ("#", 6),
        ("File Name", 30),
        ("Category", 14),
        ("Relative Folder Path", 38),
        ("Size", 14),
        ("Size (Bytes)", 16),
        ("Source Full Path", 46),
        ("Destination Full Path", 46),
        ("Status", 16)
    ]

    ws.row_dimensions[7].height = 26
    for col_idx, (col_name, _) in enumerate(headers, start=1):
        cell = ws.cell(row=7, column=col_idx, value=col_name)
        cell.font = FONT_TH
        cell.fill = NAVY_FILL
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN

    # Data Rows
    DELETE_FILL = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    FONT_DELETE = Font(name="Segoe UI", size=9.5, bold=True, color="991B1B")
    FONT_FAILED = Font(name="Segoe UI", size=9.5, bold=True, color="DC2626")

    row_cursor = 8
    for idx, item in enumerate(items, start=1):
        ws.row_dimensions[row_cursor].height = 20
        fill = ZEBRA_FILL if idx % 2 == 0 else WHITE_FILL

        ws.cell(row=row_cursor, column=1, value=idx).alignment = ALIGN_CENTER
        ws.cell(row=row_cursor, column=2, value=item.get("filename", "")).alignment = ALIGN_LEFT
        ws.cell(row=row_cursor, column=3, value=item.get("category", "").upper()).alignment = ALIGN_CENTER
        ws.cell(row=row_cursor, column=4, value=item.get("relPath", "")).alignment = ALIGN_LEFT
        ws.cell(row=row_cursor, column=5, value=format_bytes(item.get("size", 0))).alignment = ALIGN_RIGHT
        
        # Bytes with integer format
        byte_cell = ws.cell(row=row_cursor, column=6, value=item.get("size", 0))
        byte_cell.alignment = ALIGN_RIGHT
        byte_cell.number_format = '#,##0'

        ws.cell(row=row_cursor, column=7, value=item.get("sourcePath", "")).alignment = ALIGN_LEFT
        ws.cell(row=row_cursor, column=8, value=item.get("targetPath", "")).alignment = ALIGN_LEFT
        
        raw_status = item.get("status", "Transferred")
        status_cell = ws.cell(row=row_cursor, column=9, value=raw_status)
        status_cell.alignment = ALIGN_CENTER
        if "deleted" in raw_status.lower():
            status_cell.font = FONT_DELETE
            status_cell.fill = DELETE_FILL
        elif "failed" in raw_status.lower() or "error" in raw_status.lower():
            status_cell.font = FONT_FAILED
            status_cell.fill = DELETE_FILL
        else:
            status_cell.font = FONT_SUCCESS
            status_cell.fill = SUCCESS_FILL

        for c_idx in range(1, 9):
            c = ws.cell(row=row_cursor, column=c_idx)
            c.font = FONT_DATA_BOLD if c_idx == 2 else FONT_DATA
            c.fill = fill
            c.border = BORDER_THIN
        ws.cell(row=row_cursor, column=9).border = BORDER_THIN

        row_cursor += 1

    # Auto-fit column widths with padding
    for col_idx, (_, default_w) in enumerate(headers, start=1):
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = default_w

    wb.save(output_path)
    return output_path


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: generate_separation_report.py <payload.json or ->"}))
        sys.exit(1)

    input_arg = sys.argv[1]
    if input_arg == "-":
        raw = sys.stdin.read()
    else:
        with open(input_arg, "r", encoding="utf-8") as f:
            raw = f.read()

    data = json.loads(raw)
    output_path = data.get("outputPath")
    if not output_path:
        dest_dir = data.get("summary", {}).get("destDir", ".")
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        target_name = data.get("summary", {}).get("target", "Video")
        output_path = os.path.join(dest_dir, f"{target_name.capitalize()}_Separation_Report_{timestamp}.xlsx")

    result_path = generate_excel_report(data, output_path)
    print(json.dumps({"success": True, "reportPath": result_path}))


if __name__ == "__main__":
    main()
