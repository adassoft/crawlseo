import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { NoindexWarning } from "@/lib/crawler/noindex-warning";

/**
 * The latest crawl's fetched pages are (nearly) all noindex. Its score and
 * issue count leave those pages out, so they would look healthy without this.
 */
export function NoindexWarningNotice({ warning, href }: { warning: NoindexWarning; href: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-bg px-5 py-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-text-strong">{warning.message}</p>
        <p className="text-xs text-muted-foreground">
          Páginas noindex não são pontuadas, portanto a pontuação de saúde e os problemas não as incluem.{" "}
          <Link href={href} className="text-link">
            Ver páginas noindex
          </Link>
        </p>
      </div>
    </div>
  );
}
