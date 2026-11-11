import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { VitalsButton, IndexCheckButton } from "@/components/sites/action-buttons";
import { VitalsTable } from "@/components/sites/vitals-table";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function VitalsPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const reports = await db.vitalsReport.findMany({
    where: { siteId },
    orderBy: { date: "desc" },
    take: 40,
  });

  return (
    <div>
      <PageHeader
        title="Core Web Vitals"
        description="Métricas de laboratório do PageSpeed Insights para suas principais páginas."
        actions={<VitalsButton siteId={siteId} />}
      />

      {reports.length === 0 ? (
        <EmptyState
          illustration="empty-vitals"
          title="Nenhuma medição de vitals ainda"
          description="Execute uma verificação nas suas principais páginas de destino (Lighthouse Mobile)."
        />
      ) : (
        <VitalsTable
          rows={reports.map((r) => ({
            id: r.id,
            url: r.url,
            perfScore: r.perfScore,
            lcp: r.lcp,
            cls: r.cls,
            inp: r.inp,
            ttfb: r.ttfb,
            date: r.date.toISOString(),
          }))}
        />
      )}

      <div className="panel mt-6 p-5">
        <h3 className="text-[15px] leading-5 font-semibold">Cobertura de indexação</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Inspeção ao vivo de URLs no Google Search Console (URL Inspection API)
        </p>
        <IndexCheckButton siteId={siteId} />
      </div>
    </div>
  );
}
