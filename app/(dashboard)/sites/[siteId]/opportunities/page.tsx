import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAllOpportunities } from "@/lib/seo-opportunities";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { PositionBadge, NumCell, CtrCell } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function OpportunitiesPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true, _count: { select: { keywords: true } } },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  if (site._count.keywords === 0) {
    return (
      <div>
        <PageHeader
          title="Oportunidades"
          description="Ganhos rápidos calculados a partir dos dados do Search Console."
        />
        <EmptyState
          illustration="empty-gsc-wait"
          title="Sincronize o GSC primeiro"
          description="As oportunidades são calculadas com base no histórico de cliques e posições das páginas e termos."
          actionLabel="Voltar à visão geral"
          actionHref={`/sites/${siteId}`}
        />
      </div>
    );
  }

  const data = await getAllOpportunities(siteId);

  return (
    <div>
      <PageHeader
        title="Oportunidades"
        description="Termos próximos da 1ª página, CTR baixo, decaimento de páginas e canibalização de termos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CsvExportButton siteId={siteId} type="keywords" />
            <CsvExportButton siteId={siteId} type="pages" />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini label="Quase no topo" value={data.summary.strikingDistance} />
        <Mini label="CTR abaixo do esperado" value={data.summary.lowCtr} />
        <Mini label="Decaimento de tráfego" value={data.summary.contentDecay} />
        <Mini label="Canibalização" value={data.summary.cannibalization} />
      </div>

      {data.feed.length > 0 && (
        <div className="panel mb-6 p-5">
          <h2 className="text-[15px] leading-5 font-semibold">Feed de prioridades</h2>
          <ul className="mt-4 space-y-3">
            {data.feed.map((item, i) => (
              <li
                key={`${item.type}-${item.title}-${i}`}
                className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={item.type} />
                    <span
                      className={cn(
                        "mono-label rounded-md border px-2 py-0.5 text-[11px]",
                        item.severity === "high" && "border-danger/30 bg-danger-bg text-danger",
                        item.severity === "medium" && "border-warning/30 bg-warning-bg text-warning",
                        item.severity === "low" && "border-border text-text"
                      )}
                    >
                      {item.severity === "high" ? "alta" : item.severity === "medium" ? "média" : "baixa"}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-text-strong break-all">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <Section title="Quase no topo (posições 4 a 20)">
          {data.striking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade detectada no momento</p>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="mono-label text-[11px] text-muted-foreground">
                  <th className="py-2 text-left">Termo</th>
                  <th className="py-2 text-right">Pos.</th>
                  <th className="py-2 text-right">Impr.</th>
                  <th className="py-2 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {data.striking.map((k) => (
                  <tr key={k.query}>
                    <td className="py-2 font-medium">{k.query}</td>
                    <td className="py-2 text-right">
                      <PositionBadge position={k.position} />
                    </td>
                    <td className="py-2 text-right">
                      <NumCell value={k.impressions} />
                    </td>
                    <td className="py-2 text-right">
                      <NumCell value={k.clicks} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="CTR abaixo do esperado para a posição">
          {data.lowCtr.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum termo com CTR anômalo no momento</p>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="mono-label text-[11px] text-muted-foreground">
                  <th className="py-2 text-left">Termo</th>
                  <th className="py-2 text-right">Pos.</th>
                  <th className="py-2 text-right">CTR</th>
                  <th className="py-2 text-right">Esperado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {data.lowCtr.map((k) => (
                  <tr key={k.query}>
                    <td className="py-2 font-medium">{k.query}</td>
                    <td className="py-2 text-right">
                      <PositionBadge position={k.position} />
                    </td>
                    <td className="py-2 text-right">
                      <CtrCell ctr={k.ctr} />
                    </td>
                    <td className="py-2 text-right font-data text-muted-foreground">
                      {(k.expectedCtr * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Decaimento de conteúdo (páginas com queda de 25%+ em cliques)">
          {data.decay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma página em decaimento recente</p>
          ) : (
            <ul className="space-y-2">
              {data.decay.map((p) => (
                <li key={p.url} className="flex justify-between gap-4 text-sm">
                  <span className="truncate break-all text-foreground">{p.url}</span>
                  <span className="shrink-0 font-data text-danger">
                    {p.changePct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Canibalização de palavras-chave (múltiplas URLs competindo)">
          {data.cannibal.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum termo competindo entre múltiplas páginas</p>
          ) : (
            <ul className="space-y-4">
              {data.cannibal.map((c) => (
                <li key={c.query}>
                  <p className="font-medium text-text-strong">{c.query}</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {c.pages.map((p) => (
                      <li key={p.url} className="flex justify-between gap-2">
                        <span className="truncate">{p.url}</span>
                        <span className="font-data shrink-0">
                          pos {p.position.toFixed(1)} · {p.clicks} clk
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="mono-label text-[11px] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-text-strong">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel overflow-x-auto p-5">
      <h3 className="mb-4 text-[15px] leading-5 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    striking_distance: "Quase no topo",
    low_ctr: "CTR Baixo",
    content_decay: "Decaimento",
    cannibalization: "Canibalização",
  };
  return (
    <span className="mono-label rounded-md border border-border bg-bg-section px-2 py-0.5 text-[11px] text-text-strong">
      {labels[type] || type}
    </span>
  );
}
