import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/motion/create")({
  component: CreateMotionPage
});

function CreateMotionPage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="motion" mode="create" navigate={navigate} />;
}
