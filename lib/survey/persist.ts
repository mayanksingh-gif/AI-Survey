// Writes a full Survey object into a Study's columns + replaces its
// Question rows. Used by the Generator, Editor, and Reviewer's Apply Fix —
// all of them produce a complete Survey, never a partial patch, so this is
// the single write path for "the survey changed."
import { prisma } from "@/lib/db";
import type { Survey } from "@/lib/survey/types";

export async function persistSurvey(studyId: string, survey: Survey, bumpVersion = false) {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.findUniqueOrThrow({ where: { id: studyId } });

    await tx.question.deleteMany({ where: { studyId } });
    if (survey.questions.length) {
      await tx.question.createMany({
        data: survey.questions.map((q, idx) => ({
          studyId,
          order: idx,
          type: q.type,
          text: q.text,
          helpText: q.helpText ?? null,
          options: JSON.stringify(q.options ?? []),
          required: q.required ?? true,
          branchingRules: JSON.stringify(q.branching ?? []),
          extraConfig: JSON.stringify(q.extraConfig ?? {}),
          allowMediaResponse: q.allowMediaResponse ?? false,
        })),
      });
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
