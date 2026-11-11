"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GSCProperty {
  siteUrl: string;
  permissionLevel: string;
}

export function AddSiteModal({
  triggerLabel = "Adicionar site",
  handle,
}: {
  triggerLabel?: string;
  /** Opened from elsewhere (the workspace switcher): no button of its own. */
  handle?: DialogPrimitive.Handle<unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<GSCProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      setSuccess(false);
      setError("");
      if (properties.length === 0) {
        await loadGSCProperties();
      }
    }
  }

  async function loadGSCProperties() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/gsc/properties");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao carregar propriedades do Search Console");
      }

      const data = (await response.json()) as GSCProperty[];
      setProperties(data || []);

      if (!data?.length) {
        setError(
          "Nenhuma propriedade do Search Console encontrada. Verifique se esta conta Google possui acesso ao Search Console."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar propriedades do Search Console"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSite() {
    if (!selectedProperty) {
      setError("Selecione uma propriedade primeiro");
      return;
    }

    setAdding(true);
    setError("");

    try {
      // The server derives the stored domain from the property.
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gscProperty: selectedProperty }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Falha ao adicionar site");
      }

      setSuccess(true);
      setSelectedProperty("");
      router.refresh();

      setTimeout(() => {
        setOpen(false);
        if (body.id) {
          router.push(`/sites/${body.id}`);
        }
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar site");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} handle={handle}>
      {!handle && <DialogTrigger render={<Button />}>{triggerLabel}</DialogTrigger>}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Search Console</DialogTitle>
          <DialogDescription>
            Escolha uma propriedade gerenciada. Solicitamos apenas acesso de leitura ao Search Console.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
              Site conectado! Abrindo painel…
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Carregando propriedades do Google…
            </div>
          ) : properties.length > 0 ? (
            <Select
              value={selectedProperty}
              onValueChange={(value) => value !== null && setSelectedProperty(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma propriedade do GSC…" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((prop) => (
                  <SelectItem key={prop.siteUrl} value={prop.siteUrl}>
                    {prop.siteUrl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={adding}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddSite}
              disabled={!selectedProperty || loading || adding}
            >
              {adding ? "Conectando…" : "Conectar site"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
