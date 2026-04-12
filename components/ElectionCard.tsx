export interface Election {
  _id: string;
  name: string;
  description?: string;
  date: string;
  endDate?: string;
  image: string | "";
  status?: string;
  totalVoters?: number;
  category?: string;
}

export interface ElectionCardProps {
  election: Election;
  onClick: () => void;
}

const statusColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-success/10", text: "text-success", dot: "bg-success", label: "Live" },
  incomplete: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary", label: "Pending Vote" },
  upcoming: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent", label: "Upcoming" },
  complete: { bg: "bg-muted/10", text: "text-muted", dot: "bg-muted", label: "Voted" },
  closed: { bg: "bg-muted/10", text: "text-muted", dot: "bg-muted", label: "Closed" },
};

const categoryIcons: Record<string, string> = {
  "Student Government": "🏛️",
  "Campus Events": "🎉",
  "Academic": "📚",
};

const ElectionCard: React.FC<ElectionCardProps> = ({ election, onClick }) => {
  const statusKey = election.status || "active";
  const style = statusColors[statusKey] || statusColors["active"];
  const icon = categoryIcons[election.category || ""] || "🗳️";

  return (
    <div className="group glass-card p-5 flex flex-col gap-4 cursor-pointer hover:border-primary/40 hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-base leading-tight">
              {election?.name}
            </h3>
            {election.category && (
              <p className="text-xs text-muted mt-0.5">{election.category}</p>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} whitespace-nowrap`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${statusKey === "active" || statusKey === "incomplete" ? "animate-pulse" : ""}`} />
          {style.label}
        </div>
      </div>

      {/* Description */}
      {election.description && (
        <p className="text-sm text-muted leading-relaxed line-clamp-2">
          {election.description}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {new Date(election.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {election.totalVoters && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            {election.totalVoters.toLocaleString()} voters
          </span>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onClick}
        className="w-full mt-auto py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 
        hover:bg-primary hover:text-white hover:border-primary hover:shadow-glow transition-all duration-300 flex items-center justify-center gap-2"
      >
        {statusKey === "complete" ? "View Results" : "Cast Your Vote"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  );
};

export default ElectionCard;
