import { importArticlesAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button, Card, LinkButton } from "@/components/ui";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-orange";

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Add source" />
      <div className="p-8">
        <Card className="max-w-3xl p-6">
          <p className="text-[15px] text-gray-700">
            Paste help-centre content as Markdown. Each <code className="rounded bg-gray-100 px-1">#&nbsp;Heading</code> becomes a published article that drafts can cite.
          </p>
          <form action={importArticlesAction} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold">Category</span>
              <input name="category" defaultValue="General" className={`${input} mt-1.5 max-w-xs`} />
            </label>
            <textarea name="text" required rows={14} className={`${input} font-mono text-sm leading-6`}
              placeholder={"# Do you price match?\nWe don't price match, but we run a sale twice a year...\n\n# Are your boxes recyclable?\nYes. All our packaging is plastic-free and kerbside recyclable."} />
            <div className="flex gap-2.5">
              <Button variant="primary">Import articles</Button>
              <LinkButton href="/knowledge">Cancel</LinkButton>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
