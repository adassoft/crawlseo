"use client";

import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface CsvExportButtonProps {
  siteId: string;
  type: "keywords" | "pages" | "crawl-issues" | "crawl-pages";
  crawlId?: string;
  label?: string;
}

export function CsvExportButton({ siteId, type, crawlId, label }: CsvExportButtonProps) {
  const defaultLabels: Record<string, string> = {
    keywords: "Exportar palavras-chave em CSV",
    pages: "Exportar páginas em CSV",
    "crawl-issues": "Exportar problemas em CSV",
    "crawl-pages": "Exportar páginas em CSV",
  };

  const queryParams = new URLSearchParams({ type });
  if (crawlId) queryParams.set("crawlId", crawlId);

  return (
    <a
      href={`/api/sites/${siteId}/export?${queryParams.toString()}`}
      download
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <Download className="size-3.5" aria-hidden />
      {label ?? defaultLabels[type] ?? "Exportar CSV"}
    </a>
  );
}
