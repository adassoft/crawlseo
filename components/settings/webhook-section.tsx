"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/format";
import type { LastDelivery, WebhookStatus } from "@/lib/webhooks/status";

const FORM_MAX_WIDTH = "max-w-[560px]";
const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:bg-bg focus:outline-none aria-invalid:border-danger";

/** The latest delivery in one line. */
export function deliveryLine(d: LastDelivery): { ok: boolean; text: string } {
  const at = formatDay(d.at, { year: true, time: true });
  const http = d.httpStatus ? ` (HTTP ${d.httpStatus})` : "";
  switch (d.status) {
    case "delivered":
      return { ok: true, text: `Último envio: entregue com sucesso${http}, em ${at}.` };
    case "queued":
    case "running":
      return { ok: true, text: "Último envio: enviando agora." };
    case "retrying":
      return {
        ok: false,
        text: `Último envio: tentativa ${d.attempts} falhou${d.error ? `: ${d.error}` : "."} Próxima tentativa em ${formatDay(d.nextAttemptAt ?? d.at, { time: true })}.`,
      };
    case "failed":
      return { ok: false, text: `Último envio falhou após ${d.attempts} tentativa(s), em ${at}${d.error ? `: ${d.error}` : "."}` };
  }
}

/** A random secret for the form: 32 bytes as hex. */
function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Settings > Alert webhook: one URL per account that gets a signed JSON POST
 * whenever alerts fire. Test sends a test event with the values in the form.
 */
export function WebhookSection({ initial }: { initial: WebhookStatus }) {
  const id = useId();
  const [status, setStatus] = useState(initial);
  const [url, setUrl] = useState(initial.url ?? "");
  const [secret, setSecret] = useState("");
  // Only a secret made with Generate is shown, so it can be copied to the receiver. A typed one stays hidden.
  const [generated, setGenerated] = useState(false);
  const [invalid, setInvalid] = useState<"url" | "secret" | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const configured = status.url !== null;

  if (!status.enabled) {
    return (
      <div className="panel p-5 text-[13px] leading-5 text-text">
        Webhooks de alerta estão desativados neste servidor (<code className="font-data">ALERT_WEBHOOKS_ENABLED=false</code>).
      </div>
    );
  }

  async function call(kind: "save" | "test" | "remove") {
    setBusy(kind);
    setMessage(null);
    setInvalid(null);
    try {
      const res = await fetch(kind === "test" ? "/api/user/webhook/test" : "/api/user/webhook", {
        method: kind === "test" ? "POST" : kind === "save" ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: kind === "remove" ? undefined : JSON.stringify({ url, secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInvalid(data.field === "url" || data.field === "secret" ? data.field : null);
        setMessage({ ok: false, text: data.error || "Não foi possível concluir. Tente novamente." });
        return;
      }
      if (kind === "test") {
        setMessage(
          data.ok
            ? { ok: true, text: `Teste entregue: o webhook respondeu HTTP ${data.status}.` }
            : { ok: false, text: data.error || "O envio de teste falhou." }
        );
        return;
      }
      const next = data as WebhookStatus;
      setStatus(next);
      setUrl(next.url ?? "");
      setSecret("");
      setGenerated(false);
      setMessage({ ok: true, text: kind === "save" ? "Webhook salvo. Alertas disparados serão enviados para este endereço." : "Webhook removido." });
    } catch {
      setMessage({ ok: false, text: "Não foi possível concluir. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  const last = status.lastDelivery ? deliveryLine(status.lastDelivery) : null;

  return (
    <form
      noValidate
      className="panel p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void call("save");
      }}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-soft text-text-strong">
          <Webhook className="size-4" aria-hidden />
        </span>
        <div className={`min-w-0 flex-1 space-y-3 ${FORM_MAX_WIDTH}`}>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Quando alertas forem disparados, o CrawlSEO enviará um POST JSON para esta URL, assinado com o seu segredo no cabeçalho{" "}
            <code className="font-data">X-Crawlseo-Signature</code>.
            {status.serverless
              ? " Envios que falharem serão retentados após 2, 10 e 30 segundos, e depois no próximo cron."
              : " Envios que falharem serão retentados após 1, 5, 25 e 60 minutos."}
            {status.allowPrivate
              ? " Este servidor também permite endereços em redes privadas."
              : " Apenas endereços públicos são permitidos."}
          </p>
          <div>
            <label htmlFor={`${id}-url`} className="mb-1 block text-xs font-medium text-muted-foreground">
              URL do Webhook
            </label>
            <input
              id={`${id}-url`}
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://hooks.example.com/crawlseo"
              value={url}
              aria-invalid={invalid === "url" || undefined}
              onChange={(e) => {
                setUrl(e.target.value);
                setInvalid(null);
              }}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${id}-secret`} className="mb-1 block text-xs font-medium text-muted-foreground">
              Segredo de assinatura (Secret)
            </label>
            <div className="flex gap-2">
              <input
                id={`${id}-secret`}
                name="secret"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                placeholder={configured ? "Salvo. Deixe vazio para manter" : "Mínimo de 16 caracteres"}
                value={secret}
                aria-invalid={invalid === "secret" || undefined}
                aria-describedby={`${id}-secret-help`}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setGenerated(false);
                  setInvalid(null);
                }}
                className={INPUT_CLASS}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 self-center"
                onClick={() => {
                  setSecret(randomSecret());
                  setGenerated(true);
                  setInvalid(null);
                }}
              >
                Gerar
              </Button>
            </div>
            <p id={`${id}-secret-help`} className="mt-1.5 text-xs leading-[18px] text-muted-foreground">
              O seu servidor/receptor valida a assinatura com este segredo. Ele é armazenado criptografado e não será exibido novamente; copie antes de salvar.
            </p>
            {generated && secret && (
              <p className="mt-1 font-data text-xs break-all text-text">
                <span className="sr-only">Segredo gerado: </span>
                {secret}
              </p>
            )}
          </div>

          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={message.ok ? "flex items-center gap-1.5 text-xs text-success" : "text-xs text-danger"}
            >
              {message.ok && <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />}
              {message.text}
            </p>
          )}
          {last && !message && <p className={last.ok ? "text-xs text-muted-foreground" : "text-xs text-danger"}>{last.text}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={busy !== null}>
              {busy === "save" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {configured ? "Salvar alterações" : "Salvar webhook"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void call("test")}>
              {busy === "test" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Enviar teste
            </Button>
            {configured && (
              <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void call("remove")}>
                {busy === "remove" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
