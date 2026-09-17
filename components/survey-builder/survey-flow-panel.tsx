"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionEditorCard } from "@/components/survey-builder/question-editor-card";
import type { Survey, SurveyQuestion } from "@/lib/survey/types";

export function SurveyFlowPanel({
  survey,
  studyId,
  onSurveyChange,
}: {
  survey: Survey;
  studyId: string;
  onSurveyChange: (survey: Survey) => void;
}) {
  const questions = [...survey.questions].sort((a, b) => a.order - b.order);

  function updateQuestion(index: number, next: SurveyQuestion) {
    const updated = [...questions];
    updated[index] = next;
    onSurveyChange({ ...survey, questions: renumber(updated) });
  }

  function deleteQuestion(index: number) {
    const updated = questions.filter((_, i) => i !== index);
    onSurveyChange({ ...survey, questions: renumber(updated) });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onSurveyChange({ ...survey, questions: renumber(updated) });
  }

  function addQuestion() {
    const newQuestion: SurveyQuestion = {
      id: `q${crypto.randomUUID()}`,
      order: questions.length,
      type: "short_text",
      text: "New question",
      options: [],
      required: true,
    };
    onSurveyChange({ ...survey, questions: [...questions, newQuestion] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Survey Flow
        </p>
        <span className="text-xs text-muted-foreground">{questions.length} questions</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {questions.map((q, i) => (
          <QuestionEditorCard
            key={q.id}
            question={q}
            index={i}
            total={questions.length}
            allQuestions={questions}
            studyId={studyId}
            onChange={(next) => updateQuestion(i, next)}
            onDelete={() => deleteQuestion(i)}
            onMove={(dir) => moveQuestion(i, dir)}
          />
        ))}
        <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={addQuestion}>
          <Plus className="size-3.5" />
          Add question
        </Button>
      </div>
    </div>
  );
}

function renumber(questions: SurveyQuestion[]): SurveyQuestion[] {
  return questions.map((q, i) => ({ ...q, order: i }));
}
