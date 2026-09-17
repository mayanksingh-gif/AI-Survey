import { StudyProvider } from "@/lib/study-context";
import { StudyShellHeader } from "@/components/study/study-shell-header";

export default async function StudyLayout(props: LayoutProps<"/studies/[id]">) {
  const { id } = await props.params;

  return (
    <StudyProvider studyId={id}>
      <StudyShellHeader studyId={id} />
      <div className="mx-auto max-w-6xl px-6 py-8">{props.children}</div>
    </StudyProvider>
  );
}
