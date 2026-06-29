import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton de la bandeja de intercambios mientras cargan las solicitudes. */
export default function IntercambiosLoading() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Skeleton className="h-10 w-48" />

      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-3xl" />
        ))}
      </div>
    </main>
  );
}
