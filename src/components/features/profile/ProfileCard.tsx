import { MapPin, Globe, Linkedin, Github } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import type { Profile, UserSkill, Availability, RatingSummary } from "@/types/database";

/** Subconjunto público del perfil (nunca incluye email). */
export type PublicProfile = Omit<Profile, "email">;

export interface ProfileCardProps {
  profile: PublicProfile;
  skills: UserSkill[];
  ratings?: {
    summary: RatingSummary;
    recent: Array<{ stars: number; comment: string | null; created_at: string }>;
  };
}

const availabilityLabel: Record<Availability, string> = {
  available: "Disponible para intercambios",
  busy: "Ocupado",
  unavailable: "No disponible",
};

const availabilityColor: Record<Availability, string> = {
  available: "bg-green/10 text-green",
  busy: "bg-gold/15 text-cocoa",
  unavailable: "bg-cocoa/10 text-cocoa/60",
};

/** Tarjeta de perfil reutilizable: perfil propio, público y (futuro) marketplace. */
export const ProfileCard = ({ profile, skills, ratings }: ProfileCardProps) => {
  const offers = skills.filter((s) => s.kind === "offer");
  const seeks = skills.filter((s) => s.kind === "seek");
  const name = profile.full_name?.trim() || profile.username || "Usuario";

  // Garantiza que availability sea un valor conocido; si no, usa "unavailable"
  const availability: Availability = ["available", "busy", "unavailable"].includes(profile.availability)
    ? profile.availability
    : "unavailable";

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url || "/icon.svg"}
          alt={name}
          className="h-20 w-20 rounded-2xl border border-cream-300 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-bold text-cocoa">{name}</h1>
          {profile.username && (
            <p className="text-sm text-cocoa/50">@{profile.username}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-cocoa/60">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${availabilityColor[availability]}`}
            >
              {availabilityLabel[availability]}
            </span>
            {profile.modality && (
              <span className="text-xs text-cocoa/50">{profile.modality}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-cocoa/50">AynAI Score</p>
          <p className="font-serif text-3xl font-bold text-green">{profile.ayni_score}</p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-5 text-sm leading-relaxed text-cocoa/80">{profile.bio}</p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <SkillList title="Ofrece" items={offers} accent="text-green" />
        <SkillList title="Busca" items={seeks} accent="text-red" />
      </div>

      {(profile.links?.web || profile.links?.linkedin || profile.links?.github) && (
        <div className="mt-6 flex gap-4 text-cocoa/60">
          {profile.links?.web && (
            <a href={profile.links?.web} target="_blank" rel="noopener noreferrer" aria-label="Sitio web">
              <Globe size={18} />
            </a>
          )}
          {profile.links?.linkedin && (
            <a href={profile.links?.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          )}
          {profile.links?.github && (
            <a href={profile.links?.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={18} />
            </a>
          )}
        </div>
      )}

      {ratings && ratings.summary.count > 0 && (
        <section className="mt-8 border-t border-cream-300 pt-6">
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(ratings.summary.average)} readOnly size="sm" />
            <span className="text-sm font-semibold text-cocoa">{ratings.summary.average.toFixed(1)}</span>
            <span className="text-sm text-cocoa/50">({ratings.summary.count})</span>
          </div>
          <ul className="mt-4 space-y-3">
            {ratings.recent.map((r, i) => (
              <li key={i} className="rounded-2xl border border-cream-200 bg-cream/30 p-3">
                <StarRating value={r.stars} readOnly size="sm" />
                {r.comment && <p className="mt-1 text-sm text-cocoa/80">“{r.comment}”</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const SkillList = ({
  title,
  items,
  accent,
}: {
  title: string;
  items: UserSkill[];
  accent: string;
}) => (
  <div>
    <p className={`text-sm font-semibold ${accent}`}>{title}</p>
    {items.length === 0 ? (
      <p className="mt-2 text-sm text-cocoa/40">—</p>
    ) : (
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((skill) => (
          <li
            key={skill.id}
            className="rounded-full border border-cream-300 bg-cream px-3 py-1 text-xs text-cocoa"
          >
            {skill.name}
            {skill.level && <span className="text-cocoa/40"> · {skill.level}</span>}
          </li>
        ))}
      </ul>
    )}
  </div>
);
