import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTopKeywords } from "@/lib/seo-metrics";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SyncButton } from "@/components/sites/sync-button";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { KeywordsTable } from "@/components/sites/keywords-table";

interface KeywordsPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function KeywordsPage({ params }: KeywordsPageProps) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });

  if (!site || site.userId !== session?.user?.id) {
    redirect("/sites");
  }

  // Load a wide set so position/impression filters aren't capped to top-by-clicks.
  const keywords = await getTopKeywords(siteId, 28, 1000);

  return (
    <div>
      <PageHeader
        title="Palavras-chave"
        description="Termos de busca com impressões nos últimos 28 dias agregados pelo Google Search Console."
        reserveStatus
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CsvExportButton siteId={siteId} type="keywords" />
            <SyncButton siteId={siteId} />
          </div>
        }
      />

      {keywords.length === 0 ? (
        <EmptyState
          illustration="empty-keywords"
          title="Nenhuma palavra-chave ainda"
          description="Sincronize com o Google Search Console para carregar os dados de consultas e posições."
        />
      ) : (
        <KeywordsTable keywords={keywords} />
      )}
    </div>
  );
}
