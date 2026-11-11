import { Badge } from "./ui/badge";

export function TesterStatus({ status }: { status: string }) {
  const tone =
    status === "Active"
      ? "green"
      : status === "Pending Approval"
        ? "orange"
        : ["Stolen", "Damaged", "Lost"].includes(status)
          ? "red"
          : "gray";

  return <Badge tone={tone}>{status}</Badge>;
}
