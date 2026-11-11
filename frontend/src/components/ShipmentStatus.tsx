import { Badge } from "./ui/badge";

export function ShipmentStatus({ status }: { status: string }) {
  const tone =
    status === "Completed" ? "green" : status === "Scanning" ? "blue" : status === "Archived" ? "gray" : "orange";

  return <Badge tone={tone}>{status}</Badge>;
}

export function ItemStatus({ status }: { status: string }) {
  const tone = status === "Matched" ? "green" : status === "Extra" ? "orange" : status === "Missing" ? "red" : "blue";

  return <Badge tone={tone}>{status}</Badge>;
}
