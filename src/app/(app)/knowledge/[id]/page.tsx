import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/article-form";
import { PageHeader } from "@/components/page-header";
import { getStore } from "@/lib/store";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articles = await (await getStore()).articles();
  const categories = [...new Set(articles.map((a) => a.category))];
  if (id === "new") {
    return (
      <>
        <PageHeader title="New article" />
        <div className="p-8"><ArticleForm categories={categories} /></div>
      </>
    );
  }
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();
  return (
    <>
      <PageHeader title="Edit article" />
      <div className="p-8"><ArticleForm article={article} categories={categories} /></div>
    </>
  );
}
