"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  sheetName?: string;
}

export function ExportButton({
  data,
  filename,
  sheetName = "Sheet1",
}: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) => String(row[key] || "").length)
      ),
    }));
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export
    </Button>
  );
}
