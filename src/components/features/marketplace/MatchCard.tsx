import { MapPin, Star } from "lucide-react";
import { ProposeExchangeButton } from "./ProposeExchangeButton";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchCardProps {
  result: SearchResult;
  myOffers: string[];
  isPerfect: boolean;
}

/** Tarjeta de perfil enriquecida con badge de match bilateral o parcial. */
export const MatchCard = ({ result, myOffers, isPerfect }: MatchCardProps) => {
  const { profile, skills } = result;
  const name = profile.full_name?.trim() || profile.username || "Usuario";
  const offers = skills.filter((s) => s.kind === "offer");
  const seeks = skills.filter((s) => s.kind === "seek");
  const recipientOffers = offers.map((s) => s.name);

  return (
    <div
      className="flex flex-col rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden"
      style={{ borderColor: isPerfect ? "rgba(201,168,76,0.4)" : undefined }}
    >
      {/* Badge de match */}
      <div
        className={`px-5 py-2 text-xs font-bold tracking-wide ${
          isPerfect
            ? "bg-gold/10 text-cocoa border-b border-gold/20"
            : "bg-cocoa/5 text-cocoa/60 border-b border-cocoa/10"
        }`}
      >
        {isPerfect ? "✦ Match perfecto" : "◆ Match parcial"}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url || "/icon.svg"}
            alt={name}
            className="h-14 w-14 rounded-2xl border border-cream-300 object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <a
              href={`/u/${profile.username}`}
              className="font-serif text-xl font-bold text-cocoa hover:text-red transition-colors"
            >
              {name}
            </a>
            {profile.username && (
              <p className="text-xs text-cocoa/40">@{profile.username}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-cocoa/55">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} aria-hidden="true" />
                  {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-green">
                <Star size={11} aria-hidden="true" className="fill-green" />
                {profile.ayni_score}
              </span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-cocoa/70">
            {profile.bio}
          </p>
        )}

        {/* Skills */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-green mb-1.5">Ofrece</p>
            <div className="flex flex-wrap gap-1.5">
              {offers.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-green/8 px-2.5 py-1 text-[0.7rem] text-cocoa"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-red mb-1.5">Busca</p>
            <div className="flex flex-wrap gap-1.5">
              {seeks.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-red/8 px-2.5 py-1 text-[0.7rem] text-cocoa"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-cream-200">
          <ProposeExchangeButton
            recipientId={profile.id}
            recipientName={name}
            recipientOffers={recipientOffers}
            myOffers={myOffers}
          />
        </div>
      </div>
    </div>
  );
};
