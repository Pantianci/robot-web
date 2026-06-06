import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/motion/edit")({
  component: EditMotionPage
});

function EditMotionPage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="motion" mode="edit" navigate={navigate} />;
}
