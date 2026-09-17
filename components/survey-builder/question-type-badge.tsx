import { Badge } from "@/components/ui/badge";
import type { QuestionType } from "@/lib/survey/types";

const LABELS: Record<QuestionType, string> = {
  single_choice: "Single choice",
  multiple_choice: "Multi choice",
  yes_no: "Yes / No",
  short_text: "Short text",
  long_text: "Long text",
  rating: "Rating",
  likert: "Likert",
  nps: "NPS",
  slider: "Slider",
  ranking: "Ranking",
  matrix: "Matrix",
  categorize: "Categorize",
  pairwise_comparison: "Pairwise",
  swipe_card: "Swipe",
  card_choice: "Card choice",
  emoji_scale: "Emoji scale",
};

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  return (
    <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
      {LABELS[type] ?? type}
    </Badge>
  );
}

export { LABELS as QUESTION_TYPE_LABELS };
