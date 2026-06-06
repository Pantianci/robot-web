import { createFileRoute } from "@tanstack/react-router";
import { QaPage } from "@/components/page-shells";
import { useKnowledgeQaQuery } from "@/lib/hooks";

export const Route = createFileRoute("/knowledge/qa")({
  component: KnowledgeQaPage
});

function KnowledgeQaPage() {
  const { data = [] } = useKnowledgeQaQuery("knowledge");

  return (
    <QaPage
      eyebrow="多模态知识库 > 知识库问答"
      title="知识库问答"
      description="用于基于知识库内容进行自由问答或定向问答，并展示推荐问题和答案摘要。"
      prompts={data.map((item) => item.question)}
      answer={
        data[0]?.answer ??
        "当前原型将根据康复知识库内容返回摘要答案，后续可接入真实问答服务。"
      }
      qaPairs={data.map((item) => ({
        question: item.question,
        answer: item.answer
      }))}
    />
  );
}
