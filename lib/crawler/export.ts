import { db } from "@/lib/db";
import { csvTextCell } from "@/lib/seo-opportunities";
import { visibleIssuesWhere } from "@/lib/crawler/issue-filter";
import { REMEDIATION } from "@/lib/crawler/remediation";

const ISSUE_TYPE_PT: Record<string, string> = {
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

const SEVERITY_PT: Record<string, string> = {
  CRITICAL: "Crítico",
  WARNING: "Aviso",
  INFO: "Informativo",
};

export async function exportCrawlIssuesCsv(siteId: string, crawlId?: string): Promise<string> {
  const crawl = crawlId
    ? await db.crawl.findUnique({ where: { id: crawlId } })
    : await db.crawl.findFirst({
        where: { siteId, status: "COMPLETED" },
        orderBy: { finishedAt: "desc" },
      });

  if (!crawl) {
    return "Gravidade,Tipo,Mensagem,URL Afetada,Origem (Encontrado em),Como Corrigir\n";
  }

  const issues = await db.crawlIssue.findMany({
    where: visibleIssuesWhere(crawl.id),
    orderBy: [{ severity: "asc" }, { type: "asc" }, { url: "asc" }],
  });

  const issueUrls = Array.from(new Set(issues.map((i) => i.url)));

  const sourceLinks = issueUrls.length > 0
    ? await db.auditLink.findMany({
        where: {
          crawlId: crawl.id,
          targetUrl: { in: issueUrls },
        },
        select: {
          sourceUrl: true,
          targetUrl: true,
        },
      })
    : [];

  const sourcesByTarget = new Map<string, string[]>();
  for (const link of sourceLinks) {
    const list = sourcesByTarget.get(link.targetUrl) ?? [];
    if (!list.includes(link.sourceUrl)) {
      list.push(link.sourceUrl);
      sourcesByTarget.set(link.targetUrl, list);
    }
  }

  const header = "Gravidade,Tipo,Mensagem,URL Afetada,Origem (Encontrado em),Como Corrigir";
  const lines = issues.map((i) => {
    const severity = SEVERITY_PT[i.severity] ?? i.severity;
    const type = ISSUE_TYPE_PT[i.type] ?? i.type;
    const details = i.details as { howToFix?: string; urls?: string[] } | null;
    const howToFix = details?.howToFix ?? REMEDIATION[i.type]?.howToFix ?? "";
    
    // For duplicate titles, also mention duplicated URLs
    let sources = (sourcesByTarget.get(i.url) ?? []).join(" ; ");
    if (details?.urls && details.urls.length > 1) {
      const others = details.urls.filter((u) => u !== i.url).join(" ; ");
      if (others) {
        sources = sources ? `${sources} | Duplicado com: ${others}` : `Duplicado com: ${others}`;
      }
    }

    return [
      csvTextCell(severity),
      csvTextCell(type),
      csvTextCell(i.message),
      csvTextCell(i.url),
      csvTextCell(sources || "Rastreamento direto"),
      csvTextCell(howToFix),
    ].join(",");
  });

  return [header, ...lines].join("\n");
}

export async function exportCrawlPagesCsv(siteId: string, crawlId?: string): Promise<string> {
  const crawl = crawlId
    ? await db.crawl.findUnique({ where: { id: crawlId } })
    : await db.crawl.findFirst({
        where: { siteId, status: "COMPLETED" },
        orderBy: { finishedAt: "desc" },
      });

  if (!crawl) {
    return "URL,Status HTTP,Título,Meta Descrição,H1,Nota de Conteúdo,Palavras,Indexável,Tempo Resposta (ms)\n";
  }

  const pages = await db.auditPage.findMany({
    where: { crawlId: crawl.id },
    orderBy: [{ contentScore: "desc" }, { url: "asc" }],
  });

  const header = "URL,Status HTTP,Título,Meta Descrição,H1s,Nota de Conteúdo,Palavras,Indexável,Tempo Resposta (ms)";
  const lines = pages.map((p) => {
    const h1Text = Array.isArray(p.h1s) ? (p.h1s as string[]).join(" | ") : "";
    return [
      csvTextCell(p.url),
      p.statusCode,
      csvTextCell(p.title ?? ""),
      csvTextCell(p.description ?? ""),
      csvTextCell(h1Text),
      p.contentScore,
      p.wordCount,
      csvTextCell(p.indexable ? "Sim" : "Não (noindex)"),
      p.responseTimeMs,
    ].join(",");
  });

  return [header, ...lines].join("\n");
}
