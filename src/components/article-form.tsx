import { deleteArticleAction, saveArticleAction } from "@/app/actions";
import { Button, Card, LinkButton } from "@/components/ui";
import type { Article } from "@/lib/types";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-orange";

export function ArticleForm({ article, categories }: { article?: Article; categories: string[] }) {
  return (
    <Card className="max-w-3xl p-6">
      <form action={saveArticleAction} className="space-y-5">
        <input type="hidden" name="id" value={article?.id ?? ""} />
        <label className="block">
          <span className="text-sm font-bold">Title</span>
          <input name="title" required defaultValue={article?.title} className={`${input} mt-1.5`} placeholder="e.g. Changing your delivery address" />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-bold">Category</span>
            <input name="category" list="categories" defaultValue={article?.category ?? "Orders"} className={`${input} mt-1.5`} />
            <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="block">
            <span className="text-sm font-bold">Visible to</span>
            <select name="kind" defaultValue={article?.kind ?? "help"} className={`${input} mt-1.5`}>
              <option value="help">Customers (help centre)</option>
              <option value="internal">Agents only (internal note)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold">Status</span>
            <select name="status" defaultValue={article?.status ?? "published"} className={`${input} mt-1.5`}>
              <option value="published">Published · used by AI</option>
              <option value="draft">Draft · not used</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-bold">Body</span>
          <textarea name="body" required rows={10} defaultValue={article?.body} className={`${input} mt-1.5 leading-6`} placeholder="Write the policy in plain language. Drafts quote facts from here." />
        </label>
        <div className="flex items-center gap-2.5">
          <Button variant="primary">Save article</Button>
          <LinkButton href="/knowledge">Cancel</LinkButton>
          {article && <span className="ml-3 text-sm text-muted">Cited in {article.timesCited} sent replies</span>}
        </div>
      </form>
      {article && (
        <form action={deleteArticleAction.bind(null, article.id)} className="mt-6 border-t border-line pt-5">
          <Button className="text-red-600">Delete article</Button>
        </form>
      )}
    </Card>
  );
}
