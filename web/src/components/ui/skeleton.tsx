import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** ponytail: receipts/groups share the same card row shape */
function ListCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className={cn(
            "flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4",
            "md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-5",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-20" />
        </li>
      ))}
    </ul>
  );
}

/** ponytail: receipt detail / participants / summary share chrome */
function ReceiptPageSkeleton() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col pb-28 md:px-12 md:py-10 md:pb-10"
      aria-busy="true"
      aria-label="Carregando"
    >
      <header className="flex items-start gap-3 px-5 pt-3 md:px-0">
        <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-6 w-48 md:h-8 md:w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
      </header>

      <section className="mt-5 px-5 md:mt-8 md:px-0">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-10 w-40" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-14 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-14 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-14 min-w-0 flex-1 rounded-lg" />
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 px-5 md:mt-8 md:px-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </section>
    </div>
  );
}

export { Skeleton, ListCardsSkeleton, ReceiptPageSkeleton };
