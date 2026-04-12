export interface Candidate {
  id: string;
  _id?: string;
  name: string;
  party?: string;
  image: string | "";
  active: boolean;
  manifesto?: string;
}

export interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
}

const avatarColors = [
  "from-purple-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-teal-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
];

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onClick }) => {
  // Deterministic color based on name
  const colorIndex =
    candidate.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    avatarColors.length;
  const color = avatarColors[colorIndex];

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="group glass-card p-5 flex flex-col gap-4 hover:border-primary/40 hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0`}>
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-white text-base truncate">
            {candidate.name}
          </h3>
          {candidate.party && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {candidate.party}
            </span>
          )}
        </div>
      </div>

      {/* Manifesto */}
      {candidate.manifesto && (
        <div className="bg-background/40 rounded-xl px-4 py-3 border border-border/30">
          <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1.5">Manifesto</p>
          <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
            {candidate.manifesto}
          </p>
        </div>
      )}

      {/* Vote button */}
      <button
        onClick={onClick}
        className="w-full mt-auto py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-white 
        shadow-glow hover:shadow-[0_0_30px_rgba(107,56,251,0.7)] transition-all duration-300 hover:scale-[1.02]
        flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Vote for {candidate.name.split(" ")[0]}
      </button>
    </div>
  );
};

export default CandidateCard;
