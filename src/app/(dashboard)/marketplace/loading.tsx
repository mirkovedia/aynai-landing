import { Skeleton, ProfileCardSkeleton } from "@/components/ui/skeleton";

/** Skeleton del feed mientras el Server Component obtiene los perfiles. */
export default function MarketplaceLoading() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-4 w-72" />

      <Skeleton className="mt-8 h-28 w-full rounded-3xl" />
      <Skeleton className="mt-8 h-32 w-full rounded-3xl" />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProfileCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
