"use client";

import { use, useEffect, useState } from "react";
import { SurveyRunner } from "@/components/survey-runtime/survey-runner";
import { publicApi } from "@/lib/api-client";
import type { Survey } from "@/lib/survey/types";

export default function PublicSurveyPage(props: PageProps<"/s/[slug]">) {
  const { slug } = use(props.params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);

  useEffect(() => {
    publicApi
      .getSurvey(slug)
      .then(({ survey }) => setSurvey(survey))
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
          await publicApi.saveAnswer(slug, id, { answer: { questionId, value } });
        }}
        onComplete={async (path) => {
          const id = await ensureResponse();
          await publicApi.saveAnswer(slug, id, { questionPath: path, complete: true });
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
      />
    </div>
  );
}
