// In-memory database simulating a blockchain/Hyperledger Fabric state database
// In production this would be replaced by Hyperledger Fabric CouchDB state or PostgreSQL

export interface Voter {
  id: string;
  name: string;
  email: string;
  password: string; // In production: bcrypt hash
  locationId: string;
}

export interface Election {
  _id: string;
  name: string;
  description: string;
  date: string;
  endDate: string;
  status: "upcoming" | "active" | "closed";
  image: string;
  totalVoters: number;
  category: string;
}

export interface Candidate {
  id: string;
  _id: string;
  name: string;
  party: string;
  image: string;
  active: boolean;
  electionId: string;
  manifesto: string;
  voteCount: number;
}

export interface Wallet {
  voterId: string;
  publicKey: string;
  tokens: number;
}

export interface Vote {
  id: string;
  voterId: string;
  electionId: string;
  candidateId: string;
  transactionKey: string;
  signature: string;
  commitment: string;
  timestamp: string;
}

export interface VoterElection {
  voterId: string;
  electionId: string;
  status: "incomplete" | "complete";
}

const voters: Voter[] = [
  {
    id: "voter-001",
    name: "Manas Sharma",
    email: "voter@demo.com",
    password: "password123",
    locationId: "dept-cs",
  },
  {
    id: "voter-002",
    name: "Priya Singh",
    email: "priya@demo.com",
    password: "password123",
    locationId: "dept-cs",
  },
  {
    id: "voter-003",
    name: "Arjun Patel",
    email: "arjun@demo.com",
    password: "password123",
    locationId: "dept-ee",
  },
];

const elections: Election[] = [
  {
    _id: "election-2026-sc",
    name: "Student Council 2026",
    description:
      "Elect your Student Council President, Vice President, and Representatives for the academic year 2026–27. Your voice matters — shape policies that affect your campus life.",
    date: "2026-04-15",
    endDate: "2026-04-20",
    status: "active",
    image: "",
    totalVoters: 1200,
    category: "Student Government",
  },
  {
    _id: "election-2026-tech",
    name: "Tech Fest Committee",
    description:
      "Vote for the organizing committee members for TechFest 2027 — the annual inter-college technology festival. Choose leaders who will bring innovation to the biggest event of the year.",
    date: "2026-04-12",
    endDate: "2026-04-18",
    status: "active",
    image: "",
    totalVoters: 840,
    category: "Campus Events",
  },
  {
    _id: "election-2026-dept",
    name: "Department Rep Election",
    description:
      "Select your department representatives who will serve as your liaison to the academic leadership. Elect those who will advocate for better curriculum, labs, and academic resources.",
    date: "2026-05-01",
    endDate: "2026-05-05",
    status: "upcoming",
    image: "",
    totalVoters: 320,
    category: "Academic",
  },
];

const candidates: Candidate[] = [
  // Student Council
  {
    id: "cand-sc-001",
    _id: "cand-sc-001",
    name: "Riya Verma",
    party: "Progress Alliance",
    image: "",
    active: true,
    electionId: "election-2026-sc",
    manifesto:
      "Better campus Wi-Fi, 24/7 library access, and a dedicated mental health counseling center for all students.",
    voteCount: 0,
  },
  {
    id: "cand-sc-002",
    _id: "cand-sc-002",
    name: "Karan Mehta",
    party: "Student First Party",
    image: "",
    active: true,
    electionId: "election-2026-sc",
    manifesto:
      "Reducing canteen prices by 20%, introducing a student skill development fund, and monthly open-house sessions with administration.",
    voteCount: 0,
  },
  {
    id: "cand-sc-003",
    _id: "cand-sc-003",
    name: "Ananya Iyer",
    party: "United Campus",
    image: "",
    active: true,
    electionId: "election-2026-sc",
    manifesto:
      "Inclusive student events, expanded sports facilities, and launching a peer mentorship program.",
    voteCount: 0,
  },
  // Tech Fest
  {
    id: "cand-tf-001",
    _id: "cand-tf-001",
    name: "Dev Chauhan",
    party: "Innovation Squad",
    image: "",
    active: true,
    electionId: "election-2026-tech",
    manifesto:
      "National-level sponsorships, international speakers, and a dedicated startup showcase competition.",
    voteCount: 0,
  },
  {
    id: "cand-tf-002",
    _id: "cand-tf-002",
    name: "Simran Kaur",
    party: "TechVision",
    image: "",
    active: true,
    electionId: "election-2026-tech",
    manifesto:
      "Workshops by top tech companies, AI and robotics demonstrations, and live coding competitions with prizes.",
    voteCount: 0,
  },
];

const wallets: Wallet[] = [
  {
    voterId: "voter-001",
    publicKey: "0xA1B2C3D4E5F6789012345678ABCDEF012345ABCD",
    tokens: 2,
  },
  {
    voterId: "voter-002",
    publicKey: "0xB2C3D4E5F67890123456789012BCDEF01234BCDE",
    tokens: 2,
  },
  {
    voterId: "voter-003",
    publicKey: "0xC3D4E5F6789012345678901234CDEF0123456CDE",
    tokens: 2,
  },
];

const votes: Vote[] = [];

const voterElections: VoterElection[] = [
  { voterId: "voter-001", electionId: "election-2026-sc", status: "incomplete" },
  { voterId: "voter-001", electionId: "election-2026-tech", status: "incomplete" },
  { voterId: "voter-002", electionId: "election-2026-sc", status: "incomplete" },
  { voterId: "voter-003", electionId: "election-2026-tech", status: "incomplete" },
  { voterId: "voter-003", electionId: "election-2026-dept", status: "incomplete" },
];

// Singleton db object
export const db = {
  voters,
  elections,
  candidates,
  wallets,
  votes,
  voterElections,
};
