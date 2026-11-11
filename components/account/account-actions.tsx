"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  deleteAccountAction,
  disconnectGoogleAction,
  signOutAction,
  type DeleteAccountState,
} from "@/app/(dashboard)/settings/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:bg-bg focus:outline-none";

/** The submit button of a form, busy while its action runs. */
function SubmitButton({
  children,
  pendingLabel,
  variant,
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || disabled}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="outline" pendingLabel="Saindo...">
        <LogOut className="size-4" aria-hidden />
        Sair
      </SubmitButton>
    </form>
  );
}

export function DisconnectGoogleDialog({ disabled = false }: { disabled?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
        Desconectar
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desconectar o Google?</DialogTitle>
          <DialogDescription>
            O CrawlSEO solicitará ao Google a revogação de acesso, removerá os tokens salvos e
            encerrará sua sessão em todos os dispositivos. A sincronização do Search Console será
            pausada até que você faça login novamente e autorize o acesso.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Seus sites e dados históricos permanecem intactos.
        </p>

        <form action={disconnectGoogleAction} className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <CancelButton />
          <SubmitButton variant="destructive" pendingLabel="Desconectando...">
            Desconectar
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAccountDialog({
  email,
  registrationClosed,
}: {
  email: string;
  registrationClosed: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, {
    error: null,
  });
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <Dialog onOpenChange={(open) => !open && setTyped("")}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2 className="size-4" aria-hidden />
        Excluir conta
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir sua conta?</DialogTitle>
          <DialogDescription>
            Isso excluirá permanentemente sua conta, todos os sites cadastrados e dados associados
            (Search Console, auditorias de crawl, Core Web Vitals, alertas e palavras-chave salvas).
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        {registrationClosed && (
          <p className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-sm text-text-strong">
            Novos cadastros estão desativados nesta instância; esta conta do Google não poderá ser
            cadastrada novamente aqui.
          </p>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="confirm-email" className="mb-1 block text-xs font-medium text-muted-foreground">
              Digite <span className="font-data text-text-strong">{email}</span> para confirmar
            </label>
            <input
              id="confirm-email"
              name="confirmEmail"
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {state.error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <CancelButton />
            <SubmitButton variant="destructive" pendingLabel="Excluindo..." disabled={!matches}>
              Excluir conta
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Closes the dialog; disabled while the form's action runs. */
function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
      Cancelar
    </DialogClose>
  );
}
