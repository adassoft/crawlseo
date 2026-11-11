import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSealed } from "@/lib/google/token-store";
import { API_KEY_PROVIDERS, apiKeyStatus } from "@/lib/api-keys";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/account/avatar";
import { DeleteAccountDialog, SignOutButton } from "@/components/account/account-actions";
import { ConnectionsSection } from "@/components/settings/connections-section";
import { ScheduleSection } from "@/components/settings/schedule-section";
import { McpSection } from "@/components/settings/mcp-section";
import { WebhookSection } from "@/components/settings/webhook-section";
import { EmailSection } from "@/components/settings/email-section";
import { emailStatus } from "@/lib/email/status";
import { instanceOrigin } from "@/lib/instance-origin";
import { mcpStatus } from "@/lib/mcp-settings";
import { getScheduleSettings, scheduleServerInfo } from "@/lib/user-settings";
import { webhookStatus } from "@/lib/webhooks/status";

/** Granted scopes from `User.googleTokens`, which keeps them in plain text next to the encrypted tokens. */
function grantedScopes(stored: unknown): string[] {
  const scope =
    stored && typeof stored === "object" && "scope" in stored ? (stored as { scope?: unknown }).scope : null;
  return typeof scope === "string" ? scope.split(/\s+/).filter(Boolean) : [];
}

function hasToken(stored: unknown): boolean {
  if (!stored || typeof stored !== "object") return false;
  const t = stored as { accessToken?: unknown; refreshToken?: unknown };
  return typeof t.refreshToken === "string" || typeof t.accessToken === "string";
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-[15px] leading-5 font-semibold text-text-strong">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

interface Props {
  searchParams: Promise<{ connect?: string | string[] }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, image: true, googleTokens: true },
  });
  if (!user) redirect("/login");

  const connected = hasToken(user.googleTokens);
  const [keys, schedule, webhook, email, mcp] = await Promise.all([
    apiKeyStatus(db, session.user.id),
    getScheduleSettings(db, session.user.id),
    webhookStatus(db, session.user.id),
    emailStatus(db, session.user.id),
    mcpStatus(db, session.user.id),
  ]);
  const mcpEndpoint = `${await instanceOrigin()}/mcp`;
  const registrationClosed =
    process.env.DISABLE_REGISTRATION?.trim().toLowerCase() === "true";

  // ?connect=bing opens that row's form, for the "Connect Bing in Settings" links.
  const { connect } = await searchParams;
  const initialOpen = API_KEY_PROVIDERS.find((p) => p === connect) ?? null;

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Seu perfil, conexões com serviços externos, agendamento de auditorias, alertas, chaves de API e acesso MCP."
      />

      <div className="space-y-10">
        <section aria-labelledby="profile-heading">
          <SectionHeading
            id="profile-heading"
            title="Perfil"
            description="Dados da sua conta Google, atualizados a cada login."
          />
          <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={user.name} email={user.email} image={user.image} className="size-12 text-[13px]" />
              <dl className="min-w-0">
                <dt className="sr-only">Nome</dt>
                <dd className="truncate text-[15px] leading-5 font-medium text-text-strong">
                  {user.name || <span className="font-normal text-muted-foreground">Sem nome do Google ainda</span>}
                </dd>
                <dt className="sr-only">E-mail</dt>
                <dd className="mt-0.5 font-data text-[13px] leading-5 break-all text-muted-foreground">{user.email}</dd>
              </dl>
            </div>
            <SignOutButton />
          </div>
        </section>

        <section id="connections" aria-labelledby="connections-heading" className="scroll-mt-6">
          <SectionHeading
            id="connections-heading"
            title="Conexões e APIs"
            description="Cada conexão é salva na sua conta e compartilhada com todos os seus sites."
          />
          <ConnectionsSection
            google={{
              connected,
              scopes: connected ? grantedScopes(user.googleTokens) : [],
              sealed: isSealed(user.googleTokens),
            }}
            initialStatus={keys}
            initialOpen={initialOpen}
          />
        </section>

        <section id="schedule" aria-labelledby="schedule-heading" className="scroll-mt-6">
          <SectionHeading
            id="schedule-heading"
            title="Agendamento automático"
            description="Frequência das auditorias técnicas (crawl) e medições de Core Web Vitals. Sincronizações com o GSC ocorrem diariamente."
          />
          <ScheduleSection initial={{ ...schedule, server: scheduleServerInfo() }} />
        </section>

        <section id="webhook" aria-labelledby="webhook-heading" className="scroll-mt-6">
          <SectionHeading
            id="webhook-heading"
            title="Webhook de alertas"
            description="Envie notificações de alertas disparados para seu webhook (n8n, Zapier, endpoints próprios)."
          />
          <WebhookSection initial={webhook} />
        </section>

        <section id="email" aria-labelledby="email-heading" className="scroll-mt-6">
          <SectionHeading
            id="email-heading"
            title="Alertas por e-mail"
            description="Receba alertas disparados através do servidor SMTP configurado nesta instância."
          />
          <EmailSection initial={email} />
        </section>

        <section id="mcp" aria-labelledby="mcp-heading" className="scroll-mt-6">
          <SectionHeading
            id="mcp-heading"
            title="Acesso MCP & API"
            description="Acesso somente leitura para agentes de IA e integrações externas (como o painel AdasSoft), com chaves geradas aqui."
          />
          <McpSection initial={mcp} endpoint={mcpEndpoint} />
        </section>

        <section aria-labelledby="danger-heading">
          <SectionHeading id="danger-heading" title="Zona de perigo" description="Esta ação é irreversível." />
          <div className="panel flex flex-col gap-4 border-danger/30 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[15px] leading-5 font-medium text-text-strong">Excluir conta</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Exclui permanentemente sua conta, todos os sites e dados cadastrados nesta instância, revogando o acesso do Google.
              </p>
            </div>
            <DeleteAccountDialog email={user.email} registrationClosed={registrationClosed} />
          </div>
        </section>
      </div>
    </div>
  );
}
