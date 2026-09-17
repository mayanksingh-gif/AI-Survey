-- AlterTable
ALTER TABLE "Response" ADD COLUMN "deviceType" TEXT;

-- CreateTable
CREATE TABLE "AdaptiveFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "baseQuestionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdaptiveFollowUp_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestedQuestion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchSuggestion_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "nextResearch" TEXT NOT NULL,
    "evidenceStrength" TEXT NOT NULL,
    "evidenceStrengthReason" TEXT NOT NULL,
    "relatedQuestionIds" TEXT NOT NULL DEFAULT '[]',
    "followUpStudyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResponseQuality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseQuality_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT,
    "answerId" TEXT,
    "kind" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "transcript" TEXT,
    "aiAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Media_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "options" TEXT NOT NULL DEFAULT '[]',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "branchingRules" TEXT NOT NULL DEFAULT '[]',
    "extraConfig" TEXT NOT NULL DEFAULT '{}',
    "allowMediaResponse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("branchingRules", "createdAt", "helpText", "id", "options", "order", "required", "studyId", "text", "type", "updatedAt") SELECT "branchingRules", "createdAt", "helpText", "id", "options", "order", "required", "studyId", "text", "type", "updatedAt" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_studyId_order_idx" ON "Question"("studyId", "order");
CREATE TABLE "new_Study" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "researchGoal" TEXT NOT NULL,
    "followUps" TEXT NOT NULL DEFAULT '[]',
    "researchPlan" TEXT,
    "surveyTitle" TEXT,
    "welcomeScreen" TEXT,
    "thankYouScreen" TEXT,
    "experienceMode" TEXT NOT NULL DEFAULT 'professional',
    "surveyVersion" INTEGER NOT NULL DEFAULT 1,
    "analysisCache" TEXT,
    "analysisAt" DATETIME,
    "adaptiveFollowUpMode" TEXT NOT NULL DEFAULT 'off',
    "interactionLevel" TEXT NOT NULL DEFAULT 'light',
    "interactionLevelRationale" TEXT,
    "parentInsightId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Study" ("analysisAt", "analysisCache", "createdAt", "experienceMode", "followUps", "id", "researchGoal", "researchPlan", "slug", "status", "surveyTitle", "surveyVersion", "thankYouScreen", "title", "updatedAt", "welcomeScreen") SELECT "analysisAt", "analysisCache", "createdAt", "experienceMode", "followUps", "id", "researchGoal", "researchPlan", "slug", "status", "surveyTitle", "surveyVersion", "thankYouScreen", "title", "updatedAt", "welcomeScreen" FROM "Study";
DROP TABLE "Study";
ALTER TABLE "new_Study" RENAME TO "Study";
CREATE UNIQUE INDEX "Study_slug_key" ON "Study"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AdaptiveFollowUp_responseId_baseQuestionId_idx" ON "AdaptiveFollowUp"("responseId", "baseQuestionId");

-- CreateIndex
CREATE INDEX "ResearchSuggestion_studyId_status_idx" ON "ResearchSuggestion"("studyId", "status");

-- CreateIndex
CREATE INDEX "Insight_studyId_idx" ON "Insight"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseQuality_responseId_key" ON "ResponseQuality"("responseId");

-- CreateIndex
CREATE INDEX "Media_questionId_idx" ON "Media"("questionId");

-- CreateIndex
CREATE INDEX "Media_answerId_idx" ON "Media"("answerId");
