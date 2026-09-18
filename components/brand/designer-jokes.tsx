"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Purely cosmetic: rotates through designer-flavored one-liners while an AI
// call is in flight (survey generation, plan generation, etc.) so long local
// model waits feel shorter. No data dependency, safe to drop in anywhere.
const JOKES = [
  "Designer to developer: \"Can you just nudge it 1px to the left?\" Developer: \"There is no left.\"",
  "How many designers does it take to change a lightbulb? None — they'll just make the darkness feel more intentional.",
  "\"Let's make it pop\" — the most expensive four words in design.",
  "Whitespace: because sometimes the best design decision is doing nothing, confidently.",
  "A designer's favorite exercise: centering a div. Still going. Send help.",
  "Client: \"Make the logo bigger.\" Designer, internally: narrator voice, this was the beginning of the end.",
  "Comic Sans walks into a bar. The bartender says, \"We don't serve your type here.\"",
  "Design review in progress: reconciling 4 opinions, 3 fonts, and 1 very strong feeling about drop shadows.",
  "Wireframes are just love letters to your future self, written in gray boxes.",
  "\"It's not a bug, it's a design decision\" has ended more meetings than it should have.",
  "Kerning: the art of making two letters look like they've never met, then convincing them to get along.",
  "A UX designer's true love language: reducing clicks.",
  "Somewhere, a designer is arguing that 7px of padding is a personality trait.",
  "Dark mode wasn't built for aesthetics. It was built for 2am deadline energy.",
  "The five stages of grief for designers: denial, anger, bargaining, \"just one more revision,\" and shipping it anyway.",
];

export function DesignerJokes({
  className,
  // Long enough to actually read a full setup+punchline one-liner
  // (~90-120 characters) at a comfortable pace, not just glimpse it.
  intervalMs = 7000,
}: {
  className?: string;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * JOKES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % JOKES.length);
        setVisible(true);
      }, 220);
      return () => clearTimeout(swap);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <p
      className={cn(
        "text-sm text-muted-foreground italic leading-relaxed transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {JOKES[index]}
    </p>
  );
}
