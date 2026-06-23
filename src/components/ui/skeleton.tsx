import { cn } from "@/lib/utils";

/** Bloque con pulso para estados de carga. */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-cream-300/60", className)} aria-hidden="true" />
);

/** Tarjeta fantasma que imita un resultado del feed de perfiles. */
export const ProfileCardSkeleton = () => (
  <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-4">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton className="h-7 w-20 rounded-full" />
      <Skeleton className="h-7 w-24 rounded-full" />
    </div>
    <Skeleton className="mt-4 h-9 w-32 rounded-full" />
  </div>
);
