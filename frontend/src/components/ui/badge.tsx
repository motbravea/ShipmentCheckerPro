import { type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const tones = {
  green: "border-green-500/30 bg-green-500/10 text-green-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  gray: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

export function Badge({ tone = "gray", className, ...props }: BadgeProps) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone], className)} {...props} />;
}
