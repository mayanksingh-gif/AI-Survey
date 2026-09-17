import { AppShell } from "@/components/study/app-shell";
import { NewStudyHero } from "@/components/home/new-study-hero";
import { StudiesList } from "@/components/home/studies-list";

export default function Home() {
  return (
    <AppShell>
      <NewStudyHero />
      <StudiesList />
    </AppShell>
  );
}
