// Writes a full Survey object into a Study's columns + reconciles its
// Question rows. Used by the Generator, Editor, Reviewer's Apply Fix, and
// the manual builder save — all of them produce a complete Survey, never a
// partial patch, so this is the single write path for "the survey changed."
//
// IMPORTANT: this preserves existing question IDs wherever the incoming
// survey's question.id matches an existing row for this study (updates it
// in place) rather than deleting and recreating every row on every save.
// The previous delete-all/recreate-all approach churned every question's
// ID on every single edit — including the 500ms-debounced autosave that
// fires from any keystroke in the builder — which silently orphaned any
// Media row (question-stimulus or per-option image upload) attached to a
// question ID that had since been replaced. A question is only actually
// deleted if it's genuinely absent from the incoming survey (the user/AI
// removed it) and only actually created if its id doesn't match any
// existing row (new question — client-side additions use a synthetic
// `q${randomUUID()}` id, which will never collide with a real CUID).
import { prisma } from "@/lib/db";
import type { Survey } from "@/lib/survey/types";

export async function persistSurvey(studyId: string, survey: Survey, bumpVersion = false) {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.findUniqueOrThrow({ where: { id: studyId } });
    const existing = await tx.question.findMany({ where: { studyId }, select: { id: true } });
    const existingIds = new Set(existing.map((q) => q.id));
    const incomingIds = new Set(survey.questions.map((q) => q.id));

    const toDelete = existing.filter((q) => !incomingIds.has(q.id)).map((q) => q.id);
    if (toDelete.length) {
      await tx.question.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const [order, q] of survey.questions.entries()) {
      const data = {
        studyId,
        order,
        type: q.type,
        text: q.text,
        helpText: q.helpText ?? null,
        options: JSON.stringify(q.options ?? []),
        required: q.required ?? true,
        branchingRules: JSON.stringify(q.branching ?? []),
        extraConfig: JSON.stringify(q.extraConfig ?? {}),
        allowMediaResponse: q.allowMediaResponse ?? false,
      };

      if (existingIds.has(q.id)) {
        await tx.question.update({ where: { id: q.id }, data });
      } else {
        // Incoming id is a client-synthetic placeholder (new question) or
        // an AI-assigned id ("q1") that never got persisted — let Prisma
        // generate the real CUID rather than trying to force the given id.
        await tx.question.create({ data });
      }
    }

    const updated = await tx.study.update({
      where: { id: studyId },
      data: {
        surveyTitle: survey.title,
        welcomeScreen: JSON.stringify(survey.welcomeScreen),
        thankYouScreen: JSON.stringify(survey.thankYouScreen),
        experienceMode: survey.experienceMode,
        surveyVersion: bumpVersion ? study.surveyVersion + 1 : study.surveyVersion,
        ...(survey.interactionLevel ? { interactionLevel: survey.interactionLevel } : {}),
        ...(survey.interactionLevelRationale
          ? { interactionLevelRationale: survey.interactionLevelRationale }
          : {}),
        ...(survey.adaptiveFollowUpMode ? { adaptiveFollowUpMode: survey.adaptiveFollowUpMode } : {}),
      },
    });

    const questions = await tx.question.findMany({ where: { studyId }, orderBy: { order: "asc" } });
    return { study: updated, questions };
  });
}
