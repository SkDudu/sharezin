import { enter } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  // ponytail: remounts on route change → page fade; no View Transitions yet
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        enter.fade,
      )}
    >
      {children}
    </div>
  );
}
