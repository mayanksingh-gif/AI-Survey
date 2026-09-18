"use client";

import { use, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyRunner } from "@/components/survey-runtime/survey-runner";
import { ApiError, publicApi } from "@/lib/api-client";
import type { Survey } from "@/lib/survey/types";

export default function PublicSurveyPage(props: PageProps<"/s/[slug]">) {
  const { slug } = use(props.params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  function handleStaleSurvey(err: unknown) {
    if (err instanceof ApiError && err.code === "STALE_SURVEY") {
      setStale(true);
      return true;
    }
    return false;
  }

  useEffect(() => {
    publicApi
      .getSurvey(slug)
      .then(({ survey, studyId }) => {
        setSurvey(survey);
        setStudyId(studyId);
      })
      .catch(() => setError("This survey isn't available right now."));
  }, [slug]);

  async function ensureResponse() {
    if (responseId) return responseId;
    const { responseId: id } = await publicApi.startResponse(slug, false);
    setResponseId(id);
    return id;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (stale) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">
            This survey was updated. Please reload to continue with the latest version.
          </p>
          <Button variant="outline" className="gap-1.5" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" />
            Reload survey
          </Button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="animate-pulse text-sm text-muted-foreground">Loading survey…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <SurveyRunner
        survey={survey}
        onStart={async () => {
          await ensureResponse();
        }}
        onAnswer={async (questionId, value) => {
          const id = await ensureResponse();
          try {
            await publicApi.saveAnswer(slug, id, { answer: { questionId, value } });
          } catch (err) {
            if (!handleStaleSurvey(err)) throw err;
          }
        }}
        onComplete={async (path) => {
          const id = await ensureResponse();
          try {
            await publicApi.saveAnswer(slug, id, { questionPath: path, complete: true });
          } catch (err) {
            if (!handleStaleSurvey(err)) throw err;
          }
        }}
        onCheckAdaptiveFollowUp={async (questionId, answer) => {
          const id = await ensureResponse();
          const result = await publicApi.checkAdaptiveFollowUp(slug, id, questionId, answer);
          return result.shouldAsk ? { shouldAsk: true, followUp: result.followUp } : { shouldAsk: false };
        }}
        onAnswerAdaptiveFollowUp={async (followUpId, answer) => {
          const id = await ensureResponse();
          await publicApi.answerAdaptiveFollowUp(slug, id, followUpId, answer);
        }}
        studyId={studyId ?? undefined}
        responseId={responseId}
      />
    </div>
  );
}
