import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureDefaultAlerts } from "@/lib/alerts/evaluate";
import { PageHeader } from "@/components/ui/page-header";
import { EvaluateAlertsButton } from "@/components/sites/evaluate-alerts-button";
import { formatDay } from "@/lib/format";

/** Names for types whose enum name does not read well. */
const ALERT_LABELS: Record<string, string> = { NOINDEX_SITEWIDE: "a maioria das páginas é noindex" };

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function AlertsPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  await ensureDefaultAlerts(session!.user!.id, siteId);

  const alerts = await db.alert.findMany({
    where: { userId: session!.user!.id, siteId },
    orderBy: { type: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Alertas"
        description={
          <>
            Regras para quedas de tráfego, oscilações de posição, nota de crawl e Core Web Vitals.
            São avaliadas automaticamente após sincronizações e crawls ou sob demanda ao clicar em Avaliar agora.
            Alertas disparados aparecem aqui e são encaminhados para seu{" "}
            <Link href="/settings#webhook" className="text-link">
              webhook de alertas
            </Link>{" "}
            e{" "}
            <Link href="/settings#email" className="text-link">
              e-mail
            </Link>{" "}
            se configurados.
          </>
        }
        actions={<EvaluateAlertsButton />}
      />

      <div className="panel divide-y divide-border-soft">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="mono-label text-[12px] text-text-strong">
                {ALERT_LABELS[a.type] ?? a.type.replaceAll("_", " ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.lastFired
                  ? `Último disparo em ${formatDay(a.lastFired, { year: true, time: true })}`
                  : "Nunca disparado"}
              </p>
              <p className="mt-1 font-data text-[11px] text-muted-foreground">
                {JSON.stringify(a.config)}
              </p>
            </div>
            <span
              className={
                a.enabled
                  ? "mono-label rounded-md border border-success/30 bg-success-bg px-2 py-0.5 text-[11px] text-success"
                  : "mono-label rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              }
            >
              {a.enabled ? "Ativo" : "Inativo"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
