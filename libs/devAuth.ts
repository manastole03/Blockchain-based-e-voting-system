import { AuthState } from "../atoms";

export const AUTH_BYPASS_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

const initialWallet = {
  public_key: "0xA1B2C3D4E5F6789012345678ABCDEF012345ABCD",
  tokens: 2,
};

let wallet = { ...initialWallet };
let voteCounter = 0;
let issuedVotes: { key: string; signature: string; candidateId: string; electionId: string; ts: string }[] = [];

export const DEV_AUTH_STATE: AuthState = {
  name: "Manas Sharma",
  email: "voter@demo.com",
  id: "voter-001",
  isLoggedIn: true,
  token: "dev-auth-token",
  locationId: "dept-cs",
};

const elections = [
  {
    status: "incomplete",
    electionId: {
      _id: "dev-election-1",
      name: "Student Council 2026",
      description:
        "Elect your Student Council President, Vice President, and Representatives for the academic year 2026–27. Your voice matters — shape policies that affect your campus life.",
      date: "2026-04-15",
      endDate: "2026-04-20",
      status: "incomplete",
      image: "",
      totalVoters: 1200,
      category: "Student Government",
    },
  },
  {
    status: "incomplete",
    electionId: {
      _id: "dev-election-2",
      name: "Tech Fest Committee",
      description:
        "Vote for the organizing committee members for TechFest 2027 — the annual inter-college technology festival. Choose leaders who bring innovation to the biggest event of the year.",
      date: "2026-04-12",
      endDate: "2026-04-18",
      status: "incomplete",
      image: "",
      totalVoters: 840,
      category: "Campus Events",
    },
  },
];

const candidatesByElection: Record<
  string,
  {
    _id: string;
    id: string;
    name: string;
    party: string;
    image: string;
    active: boolean;
    manifesto: string;
  }[]
> = {
  "dev-election-1": [
    {
      _id: "dev-candidate-1",
      id: "dev-candidate-1",
      name: "Riya Verma",
      party: "Progress Alliance",
      image: "",
      active: true,
      manifesto:
        "Better campus Wi-Fi, 24/7 library access, and a dedicated mental health counseling center for all students.",
    },
    {
      _id: "dev-candidate-2",
      id: "dev-candidate-2",
      name: "Karan Mehta",
      party: "Student First Party",
      image: "",
      active: true,
      manifesto:
        "Reducing canteen prices by 20%, introducing a student skill development fund, and monthly open-house sessions with administration.",
    },
    {
      _id: "dev-candidate-3",
      id: "dev-candidate-3",
      name: "Ananya Iyer",
      party: "United Campus",
      image: "",
      active: true,
      manifesto:
        "Inclusive student events, expanded sports facilities, and launching a peer mentorship program.",
    },
  ],
  "dev-election-2": [
    {
      _id: "dev-candidate-4",
      id: "dev-candidate-4",
      name: "Dev Chauhan",
      party: "Innovation Squad",
      image: "",
      active: true,
      manifesto:
        "National-level sponsorships, international speakers, and a dedicated startup showcase competition.",
    },
    {
      _id: "dev-candidate-5",
      id: "dev-candidate-5",
      name: "Simran Kaur",
      party: "TechVision",
      image: "",
      active: true,
      manifesto:
        "Workshops by top tech companies, AI and robotics demonstrations, and live coding competitions with prizes.",
    },
  ],
};

// In-memory vote tally for dev mode
const devVoteTally: Record<string, number> = {
  "dev-candidate-1": 0,
  "dev-candidate-2": 0,
  "dev-candidate-3": 0,
  "dev-candidate-4": 0,
  "dev-candidate-5": 0,
};

export const resetDevSession = () => {
  wallet = { ...initialWallet };
  voteCounter = 0;
  issuedVotes = [];
  Object.keys(devVoteTally).forEach((k) => (devVoteTally[k] = 0));
};

export const getDevLoginResponse = () => ({
  user: { ...DEV_AUTH_STATE },
  token: DEV_AUTH_STATE.token,
});

export const getDevVoterResponse = () => ({
  elections: elections.map((election) => ({
    ...election,
    electionId: { ...election.electionId },
  })),
});

export const getDevWalletResponse = () => ({
  wallet: { ...wallet },
});

export const getDevElectionCandidates = (electionId: string) => {
  const candidates =
    candidatesByElection[electionId] ?? candidatesByElection["dev-election-1"];
  return candidates.map((c) => ({ ...c }));
};

export const castDevVote = (candidateId: string) => {
  if (wallet.tokens <= 0) throw new Error("No vote tokens left.");

  voteCounter += 1;
  wallet = { ...wallet, tokens: wallet.tokens - 1 };

  // Update tally
  if (devVoteTally[candidateId] !== undefined) {
    devVoteTally[candidateId] += 1;
  }

  const ts = Date.now().toString(16).toUpperCase();
  const hash = candidateId.replace(/-/g, "").slice(0, 16).toUpperCase();
  const TransactionKey = `TX-${ts}-${hash}`;
  const SignatureGenerated = `hmac-sha256:${candidateId}:${voteCounter}:dev-secret`;

  issuedVotes.push({
    key: TransactionKey,
    signature: SignatureGenerated,
    candidateId,
    electionId: "dev-election-1",
    ts: new Date().toISOString(),
  });

  return { TransactionKey, SignatureGenerated };
};

export const verifyDevVote = (TransactionKey: string) => {
  const vote = issuedVotes.find((v) => v.key === TransactionKey);
  if (!vote) return { valid: false };

  // Find candidate name
  let candidateName = "Unknown";
  for (const candidates of Object.values(candidatesByElection)) {
    const found = candidates.find((c) => c.id === vote.candidateId);
    if (found) { candidateName = found.name; break; }
  }

  return {
    valid: true,
    vote: {
      transactionKey: vote.key,
      signature: vote.signature,
      election: "Student Council 2026",
      candidate: candidateName,
      timestamp: vote.ts,
      commitment: `sha256:${vote.key}`,
    },
  };
};

export const getDevCandidateWallets = () => ({
  wallets: [
    { name: "Riya Verma", party: "Progress Alliance", public_key: "0xDEV000001RIYAVERMA", tokens: devVoteTally["dev-candidate-1"] },
    { name: "Karan Mehta", party: "Student First Party", public_key: "0xDEV000002KARANMEHTA", tokens: devVoteTally["dev-candidate-2"] },
    { name: "Ananya Iyer", party: "United Campus", public_key: "0xDEV000003ANANYAIYER", tokens: devVoteTally["dev-candidate-3"] },
    { name: "Dev Chauhan", party: "Innovation Squad", public_key: "0xDEV000004DEVCHAUHAN", tokens: devVoteTally["dev-candidate-4"] },
    { name: "Simran Kaur", party: "TechVision", public_key: "0xDEV000005SIMRANKAUR", tokens: devVoteTally["dev-candidate-5"] },
  ],
});
