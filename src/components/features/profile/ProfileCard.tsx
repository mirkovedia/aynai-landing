import { MapPin, Globe, Linkedin, Github } from "lucide-react";
import type { Profile, UserSkill, Availability } from "@/types/database";

/** Subconjunto público del perfil (nunca incluye email). */
export type PublicProfile = Omit<Profile, "email">;

interface ProfileCardProps {
  profile: PublicProfile;
  skills: UserSkill[];
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
export const ProfileCard = ({ profile, skills }: ProfileCardProps) => {
  const offers = skills.filter((s) => s.kind === "offer");
  const seeks = skills.filter((s) => s.kind === "seek");
  const name = profile.full_name?.trim() || profile.username || "Usuario";

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
              className={`rounded-full px-3 py-1 text-xs font-medium ${availabilityColor[profile.availability]}`}
            >
              {availabilityLabel[profile.availability]}
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

      {(profile.links.web || profile.links.linkedin || profile.links.github) && (
        <div className="mt-6 flex gap-4 text-cocoa/60">
          {profile.links.web && (
            <a href={profile.links.web} target="_blank" rel="noopener noreferrer" aria-label="Sitio web">
              <Globe size={18} />
            </a>
          )}
          {profile.links.linkedin && (
            <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          )}
          {profile.links.github && (
            <a href={profile.links.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={18} />
            </a>
          )}
        </div>
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
