import Link from "next/link";
import { crawlPageCeiling } from "@/lib/jobs/policy";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardMetrics } from "@/components/dashboard/metrics";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { TopKeywords } from "@/components/dashboard/top-keywords";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SyncButton } from "@/components/sites/sync-button";
import {
  CrawlButton,
  VitalsButton,
} from "@/components/sites/action-buttons";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { getAllOpportunities } from "@/lib/seo-opportunities";
import { countVisibleIssues } from "@/lib/crawler/issue-filter";
import { getNoindexWarning } from "@/lib/crawler/noindex-warning";
import { NoindexWarningNotice } from "@/components/sites/noindex-warning";
import { getCrawlActivity } from "@/lib/jobs/site-jobs";
import { cn } from "@/lib/utils";

interface SitePageProps {
  params: Promise<{ siteId: string }>;
}

export default async function SiteOverviewPage({ params }: SitePageProps) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: {
      userId: true,
      domain: true,
      gscProperty: true,
      _count: { select: { keywords: true, pages: true } },
    },
  });

  if (!site || site.userId !== session?.user?.id) {
    redirect("/sites");
  }

  const latestCrawl = await db.crawl.findFirst({
    where: { siteId, status: "COMPLETED" },
    orderBy: { finishedAt: "desc" },
    select: { id: true, healthScore: true, finishedAt: true },
  });
  // Counted live with the Crawl / Audit page's rules, so both screens agree,
  // also for crawls stored before issuesFound left out the internal rows.
  const [latestIssueCount, latestPageCount, noindexWarning] = latestCrawl
    ? await Promise.all([
        countVisibleIssues(db, latestCrawl.id),
        db.auditPage.count({ where: { crawlId: latestCrawl.id } }),
        getNoindexWarning(db, latestCrawl.id),
      ])
    : [0, 0, null];
  // A crawl in progress, or the failure of the last attempt since latestCrawl (#57).
  const crawlActivity = await getCrawlActivity(db, siteId, latestCrawl?.finishedAt ?? null);

  const latestVital = await db.vitalsReport.findFirst({
    where: { siteId },
    orderBy: { date: "desc" },
    select: { perfScore: true, lcp: true, url: true },
  });

  // Search Console anonymises the query dimension on low-traffic sites, so a
  // synced site can have pages but no keywords. Either one means data arrived.
  const hasData = site._count.keywords > 0 || site._count.pages > 0;

  const opportunities = hasData ? await getAllOpportunities(siteId) : null;

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        meta="Últimos 28 dias vs os 28 dias anteriores"
        description={<span className="font-data">{site.gscProperty || site.domain}</span>}
        reserveStatus
        actions={
          <>
            <SyncButton siteId={siteId} />
            <CrawlButton siteId={siteId} pageCeiling={crawlPageCeiling()} />
            <VitalsButton siteId={siteId} />
          </>
        }
      />

      {noindexWarning && (
        <div className="mb-[22px]">
          <NoindexWarningNotice warning={noindexWarning} href={`/sites/${siteId}/crawl?pages=noindex#crawled-pages`} />
        </div>
      )}

      {!hasData ? (
        <EmptyState
          illustration="empty-gsc-wait"
          title="Aguardando dados do GSC"
          description="Execute uma sincronização para buscar palavras-chave, páginas e dados de tráfego dos últimos 28 dias."
        />
      ) : (
        <div className="flex flex-col gap-[22px]">
          <DashboardMetrics siteId={siteId} />
          <TrafficChart siteId={siteId} />

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <TopKeywords siteId={siteId} />

            <section className="panel flex flex-col gap-3 self-start px-5 py-[18px]">
              <h2 className="text-[15px] leading-5 font-semibold">Diagnóstico do site</h2>
              <CheckRow
                label="Saúde técnica"
                value={
                  noindexWarning
                    ? "Maioria noindex"
                    : latestCrawl?.healthScore != null
                      ? `${latestCrawl.healthScore}/100`
                      : "n/a"
                }
                tone={noindexWarning ? "warning" : undefined}
              />
              <CheckRow
                label="Auditoria (Crawl)"
                value={
                  latestCrawl
                    ? `${latestPageCount} páginas · ${latestIssueCount} problemas`
                    : "Não executada"
                }
              />
              {crawlActivity.active && (
                <CheckRow label="Último crawl" value={crawlActivity.active.status === "QUEUED" ? "Na fila" : "Em execução"} />
              )}
              {crawlActivity.failed && (
                <div className="flex flex-col gap-0.5">
                  <CheckRow label="Último crawl" value="Falhou" tone="danger" />
                  <p className="text-[12px] leading-4 text-muted-foreground">
                    {crawlActivity.failed.error ?? "Nenhum motivo detalhado registrado."}
                  </p>
                </div>
              )}
              <CheckRow label="Oportunidades" value={String(opportunities?.feed.length ?? 0)} />
              <CheckRow
                label="Performance (Vitals)"
                value={latestVital?.perfScore != null ? String(latestVital.perfScore) : "n/a"}
              />
              {latestVital?.url && (
                <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
                  <span className="shrink-0 text-text">URL testada</span>
                  <span className="truncate font-data text-[12px] text-text-strong" title={latestVital.url}>
                    {latestVital.url.replace(/^https?:\/\//, "")}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px]">
                <Link href={`/sites/${siteId}/crawl`} className="text-link">
                  Auditoria (Crawl)
                </Link>
                <Link href={`/sites/${siteId}/opportunities`} className="text-link">
                  Oportunidades
                </Link>
                <Link href={`/sites/${siteId}/vitals`} className="text-link">
                  Core Web Vitals
                </Link>
              </div>
            </section>
          </div>

          <div className="flex flex-wrap gap-2">
            <CsvExportButton siteId={siteId} type="keywords" />
            <CsvExportButton siteId={siteId} type="pages" />
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
      <span className="text-text">{label}</span>
      {/* Numbers in mono; words only in mono uppercase. */}
      <span
        className={cn(
          /^[\d.,/%]+$/.test(value) ? "font-data" : "mono-label text-[12px]",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text-strong"
        )}
      >
        {value}
      </span>
    </div>
  );
}
