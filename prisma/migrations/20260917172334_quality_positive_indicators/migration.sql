-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResponseQuality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "positiveIndicators" TEXT NOT NULL DEFAULT '[]',
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseQuality_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResponseQuality" ("category", "computedAt", "flags", "id", "responseId", "score") SELECT "category", "computedAt", "flags", "id", "responseId", "score" FROM "ResponseQuality";
DROP TABLE "ResponseQuality";
ALTER TABLE "new_ResponseQuality" RENAME TO "ResponseQuality";
CREATE UNIQUE INDEX "ResponseQuality_responseId_key" ON "ResponseQuality"("responseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
