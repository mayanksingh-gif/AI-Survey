"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ImageOff, Loader2, Rocket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStudy } from "@/lib/study-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/study/status-badge";
import { api } from "@/lib/api-client";
import { findMissingImages } from "@/lib/survey/media-checks";
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
  const missingImages = findMissingImages(study.survey);

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
      {missingImages.length > 0 && (
        <div className="rounded-xl border border-signal/40 bg-signal/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ImageOff className="size-4 text-signal shrink-0" />
            Missing images for {missingImages.length} question{missingImages.length === 1 ? "" : "s"}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {missingImages.map((issue) => (
              <li key={issue.questionId}>
                “{issue.questionText}” — {issue.missingOptionLabels.join(", ")} missing an image
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Respondents will see a blank card for these options.{" "}
            <Link href={`/studies/${study.id}/build`} className="text-signal hover:underline">
              Add images in the Build tab
            </Link>
            .
          </p>
        </div>
      )}

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
              nativeButton={false}
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
