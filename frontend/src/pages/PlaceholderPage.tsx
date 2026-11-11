import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
  badge?: string;
};

export function PlaceholderPage({ title, description, badge = "Coming in later phase" }: PlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <header>
        <Badge tone="gray">{badge}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>
      </header>
      <Card className="p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {["Route connected", "UI shell ready", "Backend schema ready"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-medium text-white">{item}</p>
              <p className="mt-2 text-xs text-zinc-500">Phase 1</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
