import type { QuestionType } from "@/lib/survey/types";

export type ChartKind =
  | "donut"
  | "bar"
  | "distribution"
  | "stacked_bar"
  | "nps_breakdown"
  | "ranked_bars"
  | "text_list"
  | "matrix_grid"
  | "grouped_bar"; // V2: pairwise win-rate comparison

// PRD-mandated mapping — deterministic, not left to the LLM to decide.
export function chartKindForQuestionType(type: QuestionType): ChartKind {
  switch (type) {
    case "yes_no":
    case "swipe_card":
      return "donut";
    case "single_choice":
    case "multiple_choice":
    case "card_choice":
      return "bar";
    case "rating":
    case "slider":
    case "emoji_scale":
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
    case "matrix":
      return "matrix_grid";
    case "pairwise_comparison":
      return "grouped_bar";
    case "categorize":
      return "bar"; // aggregated as item-count-per-category bars
    default:
      return "bar";
  }
}
