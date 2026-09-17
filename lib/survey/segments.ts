// V2: Segmentation — ephemeral, session-only filters over already-fetched
// results data (no persistence layer; segments are just predicates applied
// client-side/at query time). Supports the PRD's example segments: new vs
// returning (approximated via a specific answer selection, since V1 has no
// user identity), promoters vs detractors, completed vs abandoned, specific
// answer selections, date ranges, device type.
import type { Answer, Response as ResponseRow } from "@prisma/client";

export type SegmentFilter =
  | { kind: "completion"; status: "completed" | "abandoned" }
  | { kind: "device"; deviceType: string }
  | { kind: "dateRange"; from?: string; to?: string } // ISO dates
  | { kind: "answerValue"; questionId: string; matchValue: string } // response gave this value (supports multi-select)
  | { kind: "npsSegment"; questionId: string; segment: "promoter" | "passive" | "detractor" };

export interface Segment {
  id: string;
  name: string;
  filter: SegmentFilter;
}

/** Returns the subset of responses matching a segment's filter. `answers`
 * should be all answers for the response set being filtered (not
 * pre-scoped to one question) since answerValue/npsSegment filters need to
 * look up a specific question's answer per response. */
export function applySegmentFilter(
  responses: ResponseRow[],
  answers: Answer[],
  filter: SegmentFilter,
): ResponseRow[] {
  const answersByResponse = new Map<string, Answer[]>();
  for (const a of answers) {
    const list = answersByResponse.get(a.responseId) ?? [];
    list.push(a);
    answersByResponse.set(a.responseId, list);
  }

  switch (filter.kind) {
    case "completion":
      return responses.filter((r) =>
        filter.status === "completed" ? r.status === "completed" : r.status !== "completed",
      );

    case "device":
      return responses.filter((r) => r.deviceType === filter.deviceType);

    case "dateRange":
      return responses.filter((r) => {
        const t = r.startedAt.getTime();
        if (filter.from && t < new Date(filter.from).getTime()) return false;
        if (filter.to && t > new Date(filter.to).getTime()) return false;
        return true;
      });

    case "answerValue":
      return responses.filter((r) => {
        const answer = answersByResponse.get(r.id)?.find((a) => a.questionId === filter.questionId);
        if (!answer) return false;
        const value = JSON.parse(answer.value);
        const values = Array.isArray(value) ? value.map(String) : [String(value)];
        return values.includes(filter.matchValue);
      });

    case "npsSegment":
      return responses.filter((r) => {
        const answer = answersByResponse.get(r.id)?.find((a) => a.questionId === filter.questionId);
        if (!answer) return false;
        const score = Number(JSON.parse(answer.value));
        if (!Number.isFinite(score)) return false;
        if (filter.segment === "promoter") return score >= 9;
        if (filter.segment === "detractor") return score <= 6;
        return score >= 7 && score <= 8;
      });

    default:
      return responses;
  }
}

export function segmentLabel(filter: SegmentFilter): string {
  switch (filter.kind) {
    case "completion":
      return filter.status === "completed" ? "Completed" : "Abandoned";
    case "device":
      return filter.deviceType[0].toUpperCase() + filter.deviceType.slice(1);
    case "dateRange":
      return `${filter.from ?? "…"} – ${filter.to ?? "…"}`;
    case "answerValue":
      return `Answered "${filter.matchValue}"`;
    case "npsSegment":
      return filter.segment[0].toUpperCase() + filter.segment.slice(1) + "s";
    default:
      return "Segment";
  }
}
