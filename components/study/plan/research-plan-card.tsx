import type { ResearchPlan } from "@/lib/survey/types";
import { AiLabel } from "@/components/brand/signal-glyph";

const FIELDS: { key: keyof ResearchPlan; label: string }[] = [
  { key: "surveyType", label: "Recommended method" },
  { key: "audience", label: "Audience" },
  { key: "sampleSize", label: "Suggested sample size" },
  { key: "durationMinutes", label: "Duration" },
  { key: "questionCount", label: "Questions" },
  { key: "metric", label: "Main metric" },
  { key: "distributionMethod", label: "Distribution" },
  { key: "experienceMode", label: "Experience" },
  { key: "interactionLevel", label: "Interaction level" },
];

const EXPERIENCE_LABEL: Record<string, string> = {
  professional: "Professional",
  conversational: "Conversational",
  playful: "Playful",
};

const INTERACTION_LABEL: Record<string, string> = {
  none: "None",
  light: "Light",
  medium: "Medium",
  high: "High",
};

export function ResearchPlanCard({ plan }: { plan: ResearchPlan }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 pt-6">
        <AiLabel>Recommended research plan</AiLabel>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border mt-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="bg-card px-4 py-3">
            <dt className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {key === "experienceMode"
                ? EXPERIENCE_LABEL[plan.experienceMode] ?? plan.experienceMode
                : key === "interactionLevel"
                  ? INTERACTION_LABEL[plan.interactionLevel] ?? plan.interactionLevel
                  : String(plan[key])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="px-6 py-5 border-t border-border grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
            Why this method
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{plan.rationale}</p>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
            Why this interaction level
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{plan.interactionLevelRationale}</p>
        </div>
      </div>
    </div>
  );
}
