"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Rocket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStudy } from "@/lib/study-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/study/status-badge";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export default function SharePage() {
  const { study, loading, refresh } = useStudy();
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading || !study) {
    return <Skeleton className="h-64 w-full max-w-lg mx-auto rounded-xl" />;
  }

  if (!study.survey) {
    return (
      <div className="max-w-md mx-auto text-center py-24 text-sm text-muted-foreground">
        Generate and build your survey before sharing it.
      </div>
    );
  }

  const publicPath = `/s/${study.slug}`;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : publicPath;
  const isLive = study.status === "live";

  async function handlePublish() {
    setPublishing(true);
    try {
      await api.publishStudy(study!.id);
      await refresh();
      toast.success("Survey published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <StatusBadge status={study.status} className="mx-auto" />
        <h2 className="mt-3 font-heading text-xl font-medium">
          {isLive ? "Your survey is live" : "Ready to publish"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isLive
            ? "Anyone with this link can respond — no account required."
            : "Publish to get a shareable link and QR code. You can keep editing after."}
        </p>

        {!isLive && (
          <Button size="lg" className="mt-5 gap-2" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Publish Survey
          </Button>
        )}

        {isLive && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <code className="flex-1 text-sm text-left truncate font-mono">{publicUrl}</code>
              <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="size-3.5 text-sage" /> : <Copy className="size-3.5" />}
              </Button>
            </div>

            <div className="flex justify-center py-2">
              <div className="rounded-lg border border-border p-3 bg-white">
                <QRCodeSVG value={publicUrl} size={140} />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              render={<a href={publicPath} target="_blank" rel="noreferrer" />}
            >
              Open survey
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
