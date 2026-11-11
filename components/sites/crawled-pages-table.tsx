"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CopyUrlButton } from "@/components/sites/copy-url-button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MetricTable,
  useTableSort,
  sortRows,
  sortLabel,
  SearchField,
  type MetricHeader,
} from "@/components/ui/data-table";

const HEADERS: MetricHeader[] = [
  { label: "URL", sortKey: "url", defaultDir: "asc" },
  { label: "Status", align: "right", sortKey: "statusCode" },
  { label: "Pontuação", align: "right", sortKey: "contentScore" },
  { label: "Palavras", align: "right", sortKey: "wordCount" },
  { label: "H1", align: "right", sortKey: "h1Count" },
  { label: "Imagens", align: "right", sortKey: "imagesMissingAlt" },
  { label: "Links int.", align: "right", sortKey: "internalLinks" },
  { label: "Tempo", align: "right", sortKey: "responseTimeMs" },
];

export interface CrawledPageRowData {
  id: string;
  url: string;
  statusCode: number;
  contentScore: number;
  wordCount: number;
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinks: number;
  responseTimeMs: number;
  /** False for a noindex page (#105). */
  indexable: boolean;
  /** "meta", "x-robots-tag" or both, comma-joined. */
  noindexSource: string | null;
}

export type IndexFilter = "all" | "indexable" | "noindex";

/**
 * Kept out of the audit: noindex and not broken. Mirrors NOINDEX_PAGE in
 * lib/crawler/page-stats.ts.
 */
export function isNoindexRow(r: Pick<CrawledPageRowData, "indexable" | "statusCode">): boolean {
  return !r.indexable && r.statusCode < 400;
}

const INDEX_FILTERS: { value: IndexFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "indexable", label: "Pontuadas" },
  { value: "noindex", label: "noindex" },
];

// Rows per table page. The table holds every page of the crawl, so the URL
// filter and the sort cover all of them; paging only limits what is drawn (#56).
export const PAGE_SIZE = 100;

/**
 * One table page of the filtered rows, and the footer line that says what is
 * shown: "Showing 100 of 205 pages, 1 to 100".
 */
export function paginate<T>(filtered: T[], total: number, pageIndex: number) {
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(Math.max(0, pageIndex), pageCount - 1);
  const shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const first = current * PAGE_SIZE + 1;
  const pages = (n: number) => (n === 1 ? "página" : "páginas");
  const of =
    filtered.length === total
      ? `${total} ${pages(total)}`
      : `${filtered.length} ${pages(filtered.length)} encontradas (${total} no total)`;
  const range = pageCount > 1 ? `, ${first} a ${first + shown.length - 1}` : "";
  return { shown, current, pageCount, summary: `Exibindo ${shown.length} de ${of}${range}` };
}

export function CrawledPagesTable({
  rows,
  initialFilter = "all",
}: {
  rows: CrawledPageRowData[];
  /** From ?pages=noindex, the link in the site-wide noindex warning. */
  initialFilter?: IndexFilter;
}) {
  const [search, setSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState<IndexFilter>(initialFilter);
  const [pageIndex, setPageIndex] = useState(0);
  const { sort, toggle } = useTableSort({ key: "contentScore", dir: "desc" });

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filtered = useMemo(() => {
    const out = rows.filter(
      (r) =>
        (!deferredSearch || r.url.toLowerCase().includes(deferredSearch)) &&
        (indexFilter === "all" || (indexFilter === "noindex") === isNoindexRow(r))
    );
    return sortRows(out, sort);
  }, [rows, deferredSearch, indexFilter, sort]);
  const noindexCount = useMemo(() => rows.filter(isNoindexRow).length, [rows]);

  const { shown, current, pageCount, summary } = paginate(filtered, rows.length, pageIndex);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPageIndex(0);
          }}
          placeholder="Filtrar por URL..."
        />
        {noindexCount > 0 && (
          <div role="group" aria-label="Indexação" className="flex items-center gap-1">
            {INDEX_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={indexFilter === f.value ? "default" : "outline"}
                size="xs"
                aria-pressed={indexFilter === f.value}
                onClick={() => {
                  setIndexFilter(f.value);
                  setPageIndex(0);
                }}
              >
                {f.label}
                {f.value === "noindex" ? ` (${noindexCount})` : ""}
              </Button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel px-4 py-10 text-center">
          <p className="font-medium text-text-strong">Nenhuma página encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste a busca ou o filtro.</p>
        </div>
      ) : (
        <MetricTable
          sort={sort}
          onSort={(key, dir) => {
            toggle(key, dir);
            setPageIndex(0);
          }}
          headers={HEADERS}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {summary} · ordenadas por {sortLabel(HEADERS, sort)}
              </span>
              {pageCount > 1 && (
                <nav aria-label="Páginas auditadas" className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={current === 0}
                    onClick={() => setPageIndex(current - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="font-data">
                    Página {current + 1} de {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={current === pageCount - 1}
                    onClick={() => setPageIndex(current + 1)}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </div>
          }
        >
          {shown.map((p) => (
            <tr key={p.id} className="hover:bg-bg-soft">
              <td className="px-4 py-[11px] font-data text-[12px] text-text-strong">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 max-w-sm truncate" title={p.url}>
                    {isNoindexRow(p) && (
                      <span
                        className="mono-label mr-2 inline-flex rounded-md border border-border px-1.5 py-px text-[10px] text-muted-foreground"
                        title={`noindex via ${p.noindexSource ?? "meta"}: not scored`}
                      >
                        noindex
                      </span>
                    )}
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-link hover:underline"
                    >
                      {p.url}
                    </a>
                  </div>
                  <CopyUrlButton url={p.url} />
                </div>
              </td>
              <td className="px-4 py-[11px] text-right font-data">
                <span
                  className={cn(
                    p.statusCode >= 400
                      ? "text-danger"
                      : p.statusCode >= 300
                        ? "text-warning"
                        : "text-success"
                  )}
                >
                  {p.statusCode}
                </span>
              </td>
              <td className="px-4 py-[11px] text-right font-data">
                <span
                  className={cn(
                    p.contentScore >= 70
                      ? "text-success"
                      : p.contentScore >= 50
                        ? "text-warning"
                        : "text-danger"
                  )}
                >
                  {p.contentScore}
                </span>
              </td>
              <td className="px-4 py-[11px] text-right font-data text-muted-foreground">
                {p.wordCount}
              </td>
              <td className="px-4 py-[11px] text-right font-data text-muted-foreground">
                {p.h1Count}
              </td>
              <td className="px-4 py-[11px] text-right font-data text-muted-foreground">
                {p.imagesMissingAlt > 0 ? (
                  <span className="text-warning">
                    {p.imagesMissingAlt}/{p.imageCount}
                  </span>
                ) : (
                  p.imageCount
                )}
              </td>
              <td className="px-4 py-[11px] text-right font-data text-muted-foreground">
                {p.internalLinks}
              </td>
              <td className="px-4 py-[11px] text-right font-data text-muted-foreground">
                {p.responseTimeMs}ms
              </td>
            </tr>
          ))}
        </MetricTable>
      )}
    </div>
  );
}
