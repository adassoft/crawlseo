import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportKeywordsCsv, exportPagesCsv } from "@/lib/seo-opportunities";
import { exportCrawlIssuesCsv, exportCrawlPagesCsv } from "@/lib/crawler/export";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { userId: true, domain: true },
    });
    if (!site || site.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "keywords";
    const crawlId = url.searchParams.get("crawlId") || undefined;

    let csv = "";
    let filename = "";

    if (type === "crawl-issues") {
      csv = await exportCrawlIssuesCsv(siteId, crawlId);
      filename = `${site.domain}-problemas-auditoria.csv`;
    } else if (type === "crawl-pages") {
      csv = await exportCrawlPagesCsv(siteId, crawlId);
      filename = `${site.domain}-paginas-auditadas.csv`;
    } else if (type === "pages") {
      csv = await exportPagesCsv(siteId);
      filename = `${site.domain}-pages-28d.csv`;
    } else {
      csv = await exportKeywordsCsv(siteId);
      filename = `${site.domain}-keywords-28d.csv`;
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
