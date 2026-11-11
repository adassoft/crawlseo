import { auth } from "@/lib/auth";
import { crawlPageCeiling } from "@/lib/jobs/policy";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CrawlButton } from "@/components/sites/action-buttons";
import { CrawlStatusPoller } from "@/components/sites/crawl-status-poller";
import { CrawlFailedNotice } from "@/components/sites/crawl-failed-notice";
import { CrawledPagesTable, type IndexFilter } from "@/components/sites/crawled-pages-table";
import { CopyUrlButton } from "@/components/sites/copy-url-button";
import { NoindexWarningNotice } from "@/components/sites/noindex-warning";
import { getNoindexWarning } from "@/lib/crawler/noindex-warning";
import { RobotsPanel } from "@/components/sites/robots-panel";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/format";
import { getVisibleIssues } from "@/lib/crawler/issue-filter";
import { getCrawlActivity } from "@/lib/jobs/site-jobs";
import { crawledPageColumns, getCrawlPageStats, getCrawlRobotsReport } from "@/lib/crawler/page-stats";
import { REMEDIATION } from "@/lib/crawler/remediation";
import { CsvExportButton } from "@/components/ui/csv-export-button";

const ISSUE_ROWS = 200;

interface Props {
  params: Promise<{ siteId: string }>;
  searchParams?: Promise<{ pages?: string | string[] }>;
}

export default async function CrawlPage({ params, searchParams }: Props) {
  const session = await auth();
  const { siteId } = await params;
  // ?pages=noindex opens the Crawled pages table on its noindex filter.
  const pagesParam = (await searchParams)?.pages;
  const initialFilter: IndexFilter = pagesParam === "noindex" || pagesParam === "indexable" ? pagesParam : "all";

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const latest = await db.crawl.findFirst({
    where: { siteId, status: "COMPLETED" },
    orderBy: { finishedAt: "desc" },
  });

  // A crawl job queued or running, or the failure of the last attempt since
  // `latest`. A crawl whose process died shows as failed or queued again, not
  // in progress (#57).
  const { active: activeCrawl, failed: failedCrawl } = await getCrawlActivity(
    db,
    siteId,
    latest?.finishedAt ?? null
  );

  // Issues a user sees (no crawl summary or content score rows). The table
  // lists up to ISSUE_ROWS of them; the counts cover all of them.
  const { issues, total: issueTotal, bySeverity } = latest
    ? await getVisibleIssues(db, latest.id, ISSUE_ROWS)
    : { issues: [], total: 0, bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 } };

  // Fetch referring URLs (sources) for the issues to show where links were discovered
  const issueUrls = Array.from(new Set(issues.map((i) => i.url)));
  const sourceLinks =
    latest && issueUrls.length > 0
      ? await db.auditLink.findMany({
          where: {
            crawlId: latest.id,
            targetUrl: { in: issueUrls },
          },
          select: {
            sourceUrl: true,
            targetUrl: true,
            anchorText: true,
          },
          take: 2000,
        })
      : [];

  const sourcesByTarget = new Map<string, Array<{ sourceUrl: string; anchorText: string | null }>>();
  for (const link of sourceLinks) {
    const list = sourcesByTarget.get(link.targetUrl) ?? [];
    if (!list.some((item) => item.sourceUrl === link.sourceUrl)) {
      list.push({ sourceUrl: link.sourceUrl, anchorText: link.anchorText });
      sourcesByTarget.set(link.targetUrl, list);
    }
  }

  // Page counts come from the database over every stored page, and the table
  // gets every row (a crawl stores at most 2000), so no count depends on a
  // capped list (#56).
  const [pageStats, auditPages, robotsReport, noindexWarning] = latest
    ? await Promise.all([
        getCrawlPageStats(db, latest.id),
        db.auditPage.findMany({
          where: { crawlId: latest.id },
          orderBy: [{ contentScore: "desc" }, { url: "asc" }],
          select: crawledPageColumns,
        }),
        getCrawlRobotsReport(db, latest.id),
        getNoindexWarning(db, latest.id),
      ])
    : [{ pages: 0, avgContentScore: null, orphans: 0, noindex: 0 }, [], null, null];
  const { avgContentScore, orphans: orphanCount, noindex: noindexCount } = pageStats;

  const crawledAt = latest?.finishedAt ? formatDay(latest.finishedAt, { time: true }) : null;

  return (
    <div>
      <PageHeader
        title="Auditoria técnica (Crawl)"
        meta={
          latest
            ? `Auditoria de ${crawledAt} · ${pageStats.pages} páginas rastreadas`
            : "Nenhuma auditoria realizada ainda"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {latest && issues.length > 0 && (
              <CsvExportButton
                siteId={siteId}
                type="crawl-issues"
                crawlId={latest.id}
                label="Exportar problemas (CSV)"
              />
            )}
            <CrawlButton siteId={siteId} pageCeiling={crawlPageCeiling()} />
          </div>
        }
      />

      {/* Queued or running crawl indicator */}
      {activeCrawl && (
        <CrawlStatusPoller key={activeCrawl.jobId} jobId={activeCrawl.jobId} status={activeCrawl.status} />
      )}
      {failedCrawl && <CrawlFailedNotice error={failedCrawl.error} finishedAt={failedCrawl.finishedAt} />}

      {!latest ? (
        <EmptyState
          illustration="empty-crawl"
          title="Nenhuma auditoria realizada ainda"
          description="Execute uma auditoria para analisar títulos, H1, links canônicos, links quebrados (404), sitemap e nota de conteúdo on-page."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {noindexWarning && (
            <NoindexWarningNotice warning={noindexWarning} href={`/sites/${siteId}/crawl?pages=noindex#crawled-pages`} />
          )}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="panel col-span-2 flex flex-col gap-2.5 px-5 py-[18px] lg:col-span-1">
              <span className="text-[13px] leading-5 text-muted-foreground">Saúde técnica</span>
              <span className="font-data text-[40px] leading-[44px] font-medium tracking-[-0.03em] text-text-strong">
                {latest.healthScore ?? "n/a"}
                <span className="ml-1 text-[15px] tracking-normal text-muted-foreground">/100</span>
              </span>
              <span className="mono-label text-[11px] leading-[1.5] text-muted-foreground">
                Último crawl concluído · média de conteúdo {avgContentScore ?? "n/a"}/100
              </span>
              {noindexWarning && (
                <span className="text-[12px] leading-[18px] text-warning">
                  Atenção: a maioria das páginas é noindex e não foi pontuada
                </span>
              )}
            </div>
            <CountCard label="Crítico" n={bySeverity.CRITICAL} note="Bloqueia indexação ou usuários" tone="danger" />
            <CountCard label="Aviso" n={bySeverity.WARNING} note="Prejudica o posicionamento" tone="warning" />
            <CountCard label="Informativo" n={bySeverity.INFO} note="Oportunidade de melhoria" />
          </div>

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[2.3fr_1fr]">
            {/* Issues list with remediation */}
            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 pb-1.5">
                <h2 className="text-[15px] leading-5 font-semibold">Problemas identificados</h2>
                <span className="mono-label text-[11px] text-muted-foreground">
                  {issueTotal} {issueTotal === 1 ? "problema" : "problemas"}
                </span>
              </div>
              {issueTotal === 0 ? (
                <p className="px-4 pt-2 pb-6 text-[13px] text-muted-foreground">Nenhum problema encontrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-[13px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="mono-label w-[110px] px-4 py-2.5 text-left text-[11px] font-normal text-muted-foreground">Gravidade</th>
                        <th className="mono-label px-4 py-2.5 text-left text-[11px] font-normal text-muted-foreground">Problema</th>
                        <th className="mono-label w-[42%] min-w-[280px] px-4 py-2.5 text-left text-[11px] font-normal text-muted-foreground">Página</th>
                        <th className="mono-label w-[150px] px-4 py-2.5 text-left text-[11px] font-normal text-muted-foreground">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {issues.map((issue) => {
                        const details = issue.details as { howToFix?: string; kind?: string; urls?: string[] } | null;
                        const howToFix = getHowToFix(issue.type, details?.howToFix);
                        const sources = sourcesByTarget.get(issue.url) ?? [];
                        return (
                          <tr key={issue.id} className="align-top">
                            <td className="px-4 py-3">
                              <SeverityChip severity={issue.severity} />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-text-strong">{translateIssueMessage(issue.message)}</p>
                              {howToFix && (
                                <p className="mt-1 text-[12px] leading-[18px] text-muted-foreground">
                                  <span className="font-medium text-text">Correção: </span>
                                  {howToFix}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 font-data text-[12px]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={issue.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-text-strong transition-colors hover:text-link hover:underline [overflow-wrap:anywhere]"
                                    title={issue.url}
                                  >
                                    {pathOf(issue.url)}
                                  </a>
                                </div>
                                <CopyUrlButton url={issue.url} showLink />
                              </div>

                              {/* Origem do link / Página onde foi encontrado */}
                              {sources.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1 font-sans text-[11px] text-muted-foreground">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-text">Origem:</span>
                                    {sources.slice(0, 2).map((s) => (
                                      <a
                                        key={s.sourceUrl}
                                        href={s.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-data inline-flex items-center rounded border border-border/60 bg-bg-soft px-1.5 py-0.5 text-text-strong transition-colors hover:border-link hover:text-link hover:underline [overflow-wrap:anywhere]"
                                        title={`Encontrado em: ${s.sourceUrl}${s.anchorText ? ` · Texto: "${s.anchorText}"` : ""}`}
                                      >
                                        {pathOf(s.sourceUrl)}
                                      </a>
                                    ))}
                                    {sources.length > 2 && (
                                      <span
                                        className="cursor-help text-[10px] text-muted-foreground underline decoration-dotted"
                                        title={sources.slice(2).map((s) => s.sourceUrl).join("\n")}
                                      >
                                        +{sources.length - 2} outras
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* URLs Duplicadas (Ex: Títulos ou Descrições iguais) */}
                              {details?.urls && details.urls.length > 1 && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
                                  <span className="font-semibold text-warning">Duplicado com:</span>
                                  {details.urls
                                    .filter((u) => u !== issue.url)
                                    .map((otherUrl) => (
                                      <a
                                        key={otherUrl}
                                        href={otherUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-data inline-flex items-center rounded border border-warning/30 bg-warning-bg/40 px-1.5 py-0.5 text-text transition-colors hover:border-warning hover:text-warning hover:underline [overflow-wrap:anywhere]"
                                        title={otherUrl}
                                      >
                                        {pathOf(otherUrl)}
                                      </a>
                                    ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 mono-label text-[11px] whitespace-nowrap text-muted-foreground">
                              {translateIssueType(issue.type)}
                              {details?.kind === "orphan" ? " · órfã" : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {issueTotal > issues.length && (
                    <p className="border-t border-border bg-bg-soft px-4 py-3 text-[12px] text-muted-foreground">
                      Exibindo {issues.length} de {issueTotal} problemas, mais graves primeiro
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="panel flex flex-col gap-2.5 self-start px-5 py-[18px]">
              <h2 className="text-[15px] leading-5 font-semibold">Links internos & Conteúdo</h2>
              <div className="flex justify-between gap-3 text-[13px]">
                <span>Páginas órfãs (sem links internos)</span>
                <span className="font-data text-text-strong">{orphanCount}</span>
              </div>
              <div className="flex justify-between gap-3 text-[13px]">
                <span>Nota média de conteúdo</span>
                <span className="font-data text-text-strong">{avgContentScore ?? "n/a"}</span>
              </div>
              <div className="flex justify-between gap-3 text-[13px]">
                <span>Páginas noindex (não pontuadas)</span>
                <span className="font-data text-text-strong">{noindexCount}</span>
              </div>
              {noindexCount > 0 && (
                <p className="text-[12px] leading-[18px] text-muted-foreground">
                  Páginas com meta tag noindex ou cabeçalho X-Robots-Tag são rastreadas e seus links seguidos,
                  mas não contam negativamente para a nota de saúde. Verifique a lista para confirmar se são intencionais.
                </p>
              )}
              <a href="#crawled-pages" className="text-link text-[13px]">
                Ver na tabela de páginas auditadas
              </a>
            </section>
          </div>

          {robotsReport && <RobotsPanel report={robotsReport} />}

          {/* Crawled pages table (from AuditPage model) */}
          {pageStats.pages > 0 && (
            <section id="crawled-pages" className="scroll-mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[15px] leading-5 font-semibold">Páginas auditadas</h2>
                  <p className="text-[13px] text-muted-foreground">
                    {pageStats.pages} páginas com metadados e notas detalhadas
                  </p>
                </div>
                {latest && (
                  <CsvExportButton
                    siteId={siteId}
                    type="crawl-pages"
                    crawlId={latest.id}
                    label="Exportar páginas (CSV)"
                  />
                )}
              </div>
              {/* Keyed: the warning's link is a soft navigation to this page, which must reset the filter. */}
              <CrawledPagesTable key={initialFilter} rows={auditPages} initialFilter={initialFilter} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function plural(n: number, noun: string) {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

const th = "mono-label px-4 py-2.5 text-left text-[11px] font-normal text-muted-foreground";

function pathOf(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function SeverityChip({ severity }: { severity: string }) {
  const labels: Record<string, string> = {
    CRITICAL: "Crítico",
    WARNING: "Aviso",
    INFO: "Informativo",
  };
  const label = labels[severity] ?? severity.toLowerCase();

  return (
    <span
      className={cn(
        "mono-label inline-flex rounded-md border px-2 py-0.5 text-[11px] whitespace-nowrap",
        severity === "CRITICAL" && "border-danger/30 bg-danger-bg text-danger",
        severity === "WARNING" && "border-warning/30 bg-warning-bg text-warning",
        severity === "INFO" && "border-border text-text"
      )}
    >
      {label}
    </span>
  );
}

function CountCard({
  label,
  n,
  note,
  tone,
}: {
  label: string;
  n: number;
  note: string;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="panel flex flex-col gap-2.5 px-5 py-[18px]">
      <span className="text-[13px] leading-5 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-data text-[30px] leading-9 font-medium",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text-strong"
        )}
      >
        {n}
      </span>
      <span className="text-[12px] leading-4 text-muted-foreground">{note}</span>
    </div>
  );
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  BROKEN_LINK: "Link Quebrado",
  MANAGED_INFRA: "Infraestrutura",
  REDIRECT: "Redirecionamento",
  MISSING_TITLE: "Sem Título",
  MISSING_DESCRIPTION: "Sem Descrição",
  DUPLICATE_TITLE: "Título Duplicado",
  DUPLICATE_DESCRIPTION: "Descrição Duplicada",
  MISSING_H1: "Sem H1",
  MULTIPLE_H1: "Múltiplos H1",
  MISSING_ALT: "Sem Alt",
  MISSING_CANONICAL: "Sem Canonical",
  MISSING_ROBOTS: "Sem robots.txt",
  MISSING_SITEMAP: "Sem Sitemap",
  SITEMAP_BLOCKED: "Sitemap Bloqueado",
  MISSING_SCHEMA: "Sem Schema",
  SLOW_PAGE: "Página Lenta",
  MIXED_CONTENT: "Conteúdo Misto",
  LARGE_PAGE: "Página Pesada",
};

function translateIssueType(type: string): string {
  return ISSUE_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function getHowToFix(type: string, fallback?: string): string | null {
  const rem = REMEDIATION[type];
  if (rem?.howToFix) return rem.howToFix;
  return fallback ?? null;
}

function translateIssueMessage(message: string): string {
  if (!message) return "";

  const bytesMatch = message.match(/Response exceeded (\d+) bytes/i);
  if (bytesMatch) {
    const mb = (parseInt(bytesMatch[1], 10) / (1024 * 1024)).toFixed(0);
    return `Tamanho da resposta excedeu limite de ${mb} MB (${bytesMatch[1]} bytes)`;
  }

  if (message.startsWith("HTTP ")) return `Erro ${message}`;

  if (/Missing <title> tag/i.test(message)) return "Tag <title> ausente";
  if (/Missing meta description/i.test(message)) return "Meta descrição ausente";
  if (/No H1 heading found/i.test(message)) return "Nenhum cabeçalho H1 encontrado";

  const h1Match = message.match(/(\d+) H1 headings found/i);
  if (h1Match) return `${h1Match[1]} cabeçalhos H1 encontrados (esperado apenas 1)`;

  const altMatch = message.match(/(\d+)\/(\d+) images missing alt/i);
  if (altMatch) return `${altMatch[1]} de ${altMatch[2]} imagens sem texto alt`;

  if (/No canonical tag/i.test(message)) return "Sem tag canonical";
  if (/No structured data/i.test(message)) return "Sem dados estruturados (Schema / JSON-LD)";

  const slowMatch = message.match(/Slow response:\s*(\d+)ms/i);
  if (slowMatch) return `Tempo de resposta lento: ${slowMatch[1]}ms`;

  const largeMatch = message.match(/Large HTML payload:\s*([\d.]+)MB/i);
  if (largeMatch) return `HTML muito pesado: ${largeMatch[1]} MB`;

  if (/Page loads insecure HTTP resources/i.test(message)) return "Página carrega recursos inseguros via HTTP";

  const dupTitleMatch = message.match(/Duplicate title shared by (\d+) pages/i);
  if (dupTitleMatch) return `Título duplicado compartilhado por ${dupTitleMatch[1]} páginas`;

  const dupDescMatch = message.match(/Duplicate meta description on (\d+) pages/i);
  if (dupDescMatch) return `Meta descrição duplicada em ${dupDescMatch[1]} páginas`;

  if (/Crawled page not listed in sitemap/i.test(message)) return "Página rastreada não consta no sitemap";
  if (/Potential orphan page/i.test(message)) return "Página potencialmente órfã (sem links internos recebidos)";

  const infraMatch = message.match(/Managed infra endpoint \(([^)]+)\)/i);
  if (infraMatch) return `Endpoint de infraestrutura gerenciada (${infraMatch[1]}), esperado`;

  return message;
}
