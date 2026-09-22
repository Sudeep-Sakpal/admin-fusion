import { connectDB, disconnectDB } from "../config/db";
import { ProblemStatement, Team, Track, User, UserRole } from "../models";

const TRACKS = [
  {
    name: "Artificial Intelligence & ML",
    code: "AI",
    description: "Build intelligent systems and ML-powered applications.",
    capacity: 20,
  },
  {
    name: "Web3 & Blockchain",
    code: "WEB3",
    description: "Decentralized apps, smart contracts, and blockchain tools.",
    capacity: 20,
  },
  {
    name: "FinTech",
    code: "FIN",
    description: "Solutions for banking, payments, and financial inclusion.",
    capacity: 20,
  },
  {
    name: "HealthTech",
    code: "HEALTH",
    description: "Technology for healthcare access and patient outcomes.",
    capacity: 20,
  },
];

const PROBLEM_STATEMENTS_BY_TRACK: Record<
  string,
  { title: string; description: string; code: string }[]
> = {
  AI: [
    {
      title: "Smart Resume Screener",
      description: "Automate candidate shortlisting using NLP.",
      code: "AI-01",
    },
    {
      title: "Crop Disease Detector",
      description: "Classify plant diseases from leaf images.",
      code: "AI-02",
    },
  ],
  WEB3: [
    {
      title: "Decentralized Voting",
      description: "Tamper-proof voting using smart contracts.",
      code: "WEB3-01",
    },
    {
      title: "NFT Ticketing",
      description: "Event ticketing with fraud-proof NFTs.",
      code: "WEB3-02",
    },
  ],
  FIN: [
    {
      title: "Micro-Savings Assistant",
      description: "Nudge users toward small, automated savings goals.",
      code: "FIN-01",
    },
    {
      title: "Expense Anomaly Detector",
      description: "Flag unusual spending patterns in real time.",
      code: "FIN-02",
    },
  ],
  HEALTH: [
    {
      title: "Appointment No-Show Predictor",
      description: "Predict and reduce missed clinic appointments.",
      code: "HEALTH-01",
    },
    {
      title: "Medication Adherence Tracker",
      description: "Help patients stay on track with prescriptions.",
      code: "HEALTH-02",
    },
  ],
};

const TEAM_LEADERS = [
  {
    userId: "TL001",
    name: "Asha Verma",
    email: "asha.verma@example.com",
    teamName: "Team Nimbus",
  },
  {
    userId: "TL002",
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    teamName: "Team Vertex",
  },
  {
    userId: "TL003",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    teamName: "Team Catalyst",
  },
];

const DEFAULT_PASSWORD = "Passw0rd!";

async function seed() {
  await connectDB();

  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Track.deleteMany({}),
    ProblemStatement.deleteMany({}),
  ]);

  console.log("Seeding tracks...");
  const tracks = await Track.insertMany(TRACKS);
  const trackByCode = new Map(tracks.map((track) => [track.code, track]));

  console.log("Seeding problem statements...");
  const problemStatementDocs = Object.entries(PROBLEM_STATEMENTS_BY_TRACK).flatMap(
    ([trackCode, statements]) => {
      const track = trackByCode.get(trackCode);
      if (!track) return [];
      return statements.map((statement) => ({
        ...statement,
        track: track._id,
      }));
    }
  );
  const problemStatements = await ProblemStatement.insertMany(problemStatementDocs);

  console.log("Seeding admin user...");
  await User.create({
    userId: "ADMIN001",
    name: "Admin",
    email: "admin@example.com",
    password: DEFAULT_PASSWORD,
    role: UserRole.ADMIN,
  });

  console.log("Seeding team leaders and teams...");
  // Teams start with no track selected (selectionStatus defaults to
  // PENDING) so the track-selection API has real, untouched dummy teams
  // to exercise. Track/problem-statement assignment is done through the
  // actual selection endpoints, not pre-seeded.
  for (const leaderInfo of TEAM_LEADERS) {
    const team = await Team.create({ name: leaderInfo.teamName });

    await User.create({
      userId: leaderInfo.userId,
      name: leaderInfo.name,
      email: leaderInfo.email,
      password: DEFAULT_PASSWORD,
      role: UserRole.TEAM_LEADER,
      team: team._id,
    });
  }

  console.log("Seed complete:");
  console.log(`  Tracks: ${tracks.length}`);
  console.log(`  Problem statements: ${problemStatements.length}`);
  console.log(`  Teams: ${TEAM_LEADERS.length}`);
  console.log(`  Users: ${TEAM_LEADERS.length + 1} (1 admin + ${TEAM_LEADERS.length} team leaders)`);
  console.log(`  Default password for all seeded users: ${DEFAULT_PASSWORD}`);
  console.log(
    `  Login userIds: ADMIN001, ${TEAM_LEADERS.map((t) => t.userId).join(", ")}`
  );
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
