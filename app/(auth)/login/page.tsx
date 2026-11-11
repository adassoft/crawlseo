import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { registrationClosedMessage } from "@/lib/registration";

// Auth.js sends a refused sign-in back here as ?error=AccessDenied, which only
// the signIn callback produces (DISABLE_REGISTRATION). Its copy can be set with
// REGISTRATION_CLOSED_MESSAGE. Any other code gets the generic line.
function errorMessage(error: string | string[] | undefined): string | null {
  if (!error) return null;
  if (error === "AccessDenied") {
    return registrationClosedMessage();
  }
  return "Falha ao entrar. Por favor, tente novamente.";
}

// Set by the account actions (app/(dashboard)/settings/actions.ts) after they sign the user out.
const UNREVOKED =
  " O Google não confirmou a revogação: por garantia, remova o crawlseo em myaccount.google.com/permissions.";
const NOTICES: Record<string, string> = {
  disconnected: "O Google foi desconectado e você saiu da sessão. Entre novamente para reconectar o Search Console.",
  "disconnected-unrevoked":
    "Você saiu da sessão e os tokens do Google foram removidos deste servidor." + UNREVOKED,
  deleted: "Sua conta e todos os dados associados foram excluídos.",
  "deleted-unrevoked": "Sua conta e todos os dados foram excluídos." + UNREVOKED,
  "delete-failed": "Não foi possível excluir sua conta. Faça login e tente novamente.",
};

function noticeMessage(notice: string | string[] | undefined): string | null {
  return typeof notice === "string" ? (NOTICES[notice] ?? null) : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/sites");
  }
  const params = await searchParams;
  const error = errorMessage(params.error);
  const notice = noticeMessage(params.notice);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-text-strong">
            <Logo className="h-8" />
          </h1>
          <p className="text-atom-body text-muted-foreground">Monitoramento e SEO self-hosted</p>
        </div>

        <div className="panel p-8">
          <h2 className="text-atom-title font-medium">Entrar</h2>
          <p className="mt-2 text-atom-body text-muted-foreground">
            Conecte o Google Search Console com acesso somente leitura.
          </p>

          {notice && (
            <p role="status" className="mt-4 text-atom-body text-text-strong">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-atom-body text-danger">
              {error}
            </p>
          )}

          <form
            className="mt-6"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/sites" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              Continuar com o Google
            </Button>
          </form>

          <ul className="mt-6 space-y-1.5 border-t border-border pt-5 text-[13px] leading-5 text-muted-foreground">
            <li>Palavras-chave, posições e CTR direto do GSC</li>
            <li>Auditoria técnica (Crawl) e Core Web Vitals</li>
            <li>Seus dados permanecem no seu servidor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
