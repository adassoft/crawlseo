import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteSiteButton } from "@/components/sites/delete-site-button";
import { BingSiteSection } from "@/components/settings/bing-site-section";
import { formatDay } from "@/lib/format";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: {
      userId: true,
      domain: true,
      gscProperty: true,
      bingSite: true,
      createdAt: true,
      _count: {
        select: {
          keywords: true,
          pages: true,
          crawls: true,
          vitals: true,
          alerts: true,
          savedKeywords: true,
        },
      },
    },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  // The Bing key is stored per user, in Settings; this page only picks the property.
  const bingKey = await db.apiKey.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "bing" } },
    select: { id: true },
  });

  return (
    <div>
      <PageHeader
        title="Configurações do site"
        description={`Configurações e dados armazenados para ${site.domain}. Chaves de API globais e conta Google ficam nas Configurações gerais.`}
      />

      <div className="space-y-6">
        {/* Site info */}
        <div className="panel p-5">
          <h3 className="text-[15px] leading-5 font-semibold text-text-strong">
            Detalhes do site
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Domínio</dt>
              <dd className="font-medium text-text-strong">{site.domain}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Propriedade no GSC</dt>
              <dd className="font-medium text-text-strong">
                {site.gscProperty || "Não conectado"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Propriedade no Bing</dt>
              <dd className="font-medium text-text-strong">
                {site.bingSite || "Não conectado"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Adicionado em</dt>
              <dd className="font-medium text-text-strong">
                {formatDay(site.createdAt, { year: true })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bing Webmaster property: only with a Bing key */}
        {bingKey ? (
          <BingSiteSection siteId={siteId} bingSite={site.bingSite} />
        ) : (
          <p className="panel px-5 py-4 text-sm text-muted-foreground">
            Bing Webmaster Tools não está conectado.{" "}
            <Link href="/settings?connect=bing#connections" className="text-link font-medium">
              Conectar Bing nas Configurações
            </Link>
          </p>
        )}

        {/* Data summary */}
        <section aria-labelledby="stored-data-heading">
          <h3 id="stored-data-heading" className="mb-3 text-[15px] leading-5 font-semibold text-text-strong">
            Dados armazenados
          </h3>
          <ul className="panel divide-y divide-border-soft">
            <DataStat label="Registros de palavras-chave" value={site._count.keywords} />
            <DataStat label="Registros de páginas" value={site._count.pages} />
            <DataStat label="Auditorias (crawls)" value={site._count.crawls} />
            <DataStat label="Relatórios de vitals" value={site._count.vitals} />
            <DataStat label="Regras de alerta" value={site._count.alerts} />
            <DataStat label="Palavras salvas" value={site._count.savedKeywords} />
          </ul>
        </section>

        {/* Danger zone */}
        <div className="panel border-danger/30 p-5">
          <h3 className="text-[15px] leading-5 font-semibold text-danger">
            Zona de perigo
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Excluir permanentemente este site e todos os dados associados. Esta ação não pode ser desfeita.
          </p>
          <div className="mt-4">
            <DeleteSiteButton siteId={siteId} domain={site.domain} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-data font-medium text-text-strong">{value.toLocaleString()}</span>
    </li>
  );
}
