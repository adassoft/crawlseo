"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyUrlButtonProps {
  url: string;
  className?: string;
  showLink?: boolean;
}

export function CopyUrlButton({ url, className, showLink = false }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "URL copiada com sucesso!" : "Copiar URL completa"}
        aria-label={copied ? "URL copiada" : "Copiar URL"}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded border transition-colors",
          copied
            ? "border-success/40 bg-success-bg text-success"
            : "border-border bg-bg-soft text-muted-foreground hover:border-brand-500 hover:bg-bg hover:text-text-strong"
        )}
      >
        {copied ? (
          <Check className="size-3 text-success animate-in zoom-in-50" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
      {showLink && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir página em nova aba"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-border bg-bg-soft text-muted-foreground transition-colors hover:border-brand-500 hover:bg-bg hover:text-text-strong"
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

