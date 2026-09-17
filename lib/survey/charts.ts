import type { QuestionType } from "@/lib/survey/types";

export type ChartKind =
  | "donut"
  | "bar"
  | "distribution"
  | "stacked_bar"
  | "nps_breakdown"
  | "ranked_bars"
  | "text_list";

// PRD-mandated mapping — deterministic, not left to the LLM to decide.
export function chartKindForQuestionType(type: QuestionType): ChartKind {
  switch (type) {
    case "yes_no":
      return "donut";
    case "single_choice":
    case "multiple_choice":
      return "bar";
    case "rating":
    case "slider":
      return "distribution";
    case "likert":
      return "stacked_bar";
    case "nps":
      return "nps_breakdown";
    case "ranking":
      return "ranked_bars";
    case "short_text":
    case "long_text":
      return "text_list";
    default:
      return "bar";
  }
}
