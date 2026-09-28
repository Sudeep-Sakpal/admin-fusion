import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { ProblemStatement, Team, Track, User, UserRole } from "../models";

// ─── Final event structure ────────────────────────────────────────────────────
// 6 tracks, 144 shortlisted teams total, capacity 24 per track.
// Seed contains 3 dummy teams for development/testing only.

const TRACKS = [
  {
    name: "GeoAI",
    code: "GEOAI",
    description: "Geospatial intelligence powered by AI and satellite data.",
    capacity: 24,
  },
  {
    name: "SpaceTech",
    code: "SPACETECH",
    description: "Innovations in space exploration, satellites, and beyond.",
    capacity: 24,
  },
  {
    name: "FinTech",
    code: "FINTECH",
    description: "Solutions for banking, payments, and financial inclusion.",
    capacity: 24,
  },
  {
    name: "IoT",
    code: "IOT",
    description: "Connected devices and smart systems for the physical world.",
    capacity: 24,
  },
  {
    name: "CyberSec & Blockchain",
    code: "CYBERSEC",
    description: "Cybersecurity tools, threat detection, and blockchain solutions.",
    capacity: 24,
  },
  {
    name: "Healthcare",
    code: "HEALTHCARE",
    description: "Technology for healthcare access and better patient outcomes.",
    capacity: 24,
  },
];

const PROBLEM_STATEMENTS_BY_TRACK: Record<
  string,
  { title: string; description: string; code: string }[]
> = {
  GEOAI: [
    {
      title: "Urban Heat Island Mapper",
      description:
        "Use satellite imagery and AI to identify and visualise urban heat islands for city planners.",
      code: "GEO-01",
    },
    {
      title: "Flood Risk Predictor",
      description:
        "Combine topographic and precipitation data to predict neighbourhood-level flood risk in real time.",
      code: "GEO-02",
    },
  ],
  SPACETECH: [
    {
      title: "Debris Collision Avoidance System",
      description:
        "Track low-Earth-orbit debris and alert satellite operators of collision risks using predictive modelling.",
      code: "SPACE-01",
    },
    {
      title: "Satellite Imagery Crop Monitor",
      description:
        "Analyse multispectral satellite images to track crop health and yield forecasts across large farmlands.",
      code: "SPACE-02",
    },
  ],
  FINTECH: [
    {
      title: "Micro-Savings Assistant",
      description:
        "Nudge users toward small, automated savings goals through behavioural analytics and personalised prompts.",
      code: "FIN-01",
    },
    {
      title: "Expense Anomaly Detector",
      description:
        "Flag unusual spending patterns in real time to help users and banks prevent fraud.",
      code: "FIN-02",
    },
  ],
  IOT: [
    {
      title: "Smart Energy Consumption Dashboard",
      description:
        "Aggregate data from IoT sensors to give households and facilities actionable energy-saving insights.",
      code: "IOT-01",
    },
    {
      title: "Predictive Equipment Maintenance",
      description:
        "Use sensor telemetry from industrial equipment to predict failures before they occur.",
      code: "IOT-02",
    },
  ],
  CYBERSEC: [
    {
      title: "Phishing URL Classifier",
      description:
        "Build an ML model that identifies phishing URLs in real time to protect users from social engineering.",
      code: "CYBER-01",
    },
    {
      title: "Decentralised Identity Wallet",
      description:
        "Create a blockchain-based self-sovereign identity wallet that minimises reliance on centralised authorities.",
      code: "CYBER-02",
    },
  ],
  HEALTHCARE: [
    {
      title: "Appointment No-Show Predictor",
      description:
        "Predict and reduce missed clinic appointments using patient history and contextual signals.",
      code: "HEALTH-01",
    },
    {
      title: "Medication Adherence Tracker",
      description:
        "Help patients stay on track with prescriptions through smart reminders and adherence analytics.",
      code: "HEALTH-02",
    },
  ],
};

// 3 dummy team leaders for development/testing.
// All teams start with track: null, problemStatement: null,
// selectionStatus: PENDING (model defaults handle this automatically).
const TEAM_LEADERS = [
  {
    userId: "TL001",
    name: "Team Leader 001",
    email: "tl001@example.com",
    teamName: "Team Geo Titans",
  },
  {
    userId: "TL002",
    name: "Team Leader 002",
    email: "tl002@example.com",
    teamName: "Team SpaceXplore",
  },
  {
    userId: "TL003",
    name: "Team Leader 003",
    email: "tl003@example.com",
    teamName: "Team FinNova",
  },
];

const DEFAULT_PASSWORD = "Passw0rd!";

/**
 * This script is destructive — it deletes every user, team, track and
 * problem statement before re-inserting dummy data. Run against the live
 * event database it would wipe the entire hackathon and replace the real
 * accounts with ones whose password is published in this file.
 *
 * It therefore refuses to run in production unless the operator explicitly
 * opts in with ALLOW_DESTRUCTIVE_SEED=true, and always prints the target
 * database first so an accidental run against the wrong URI is obvious.
 */
function assertSeedingAllowed(): void {
  if (env.nodeEnv !== "production") return;

  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      "Refusing to seed: NODE_ENV=production and this script DELETES ALL " +
        "users, teams, tracks and problem statements. If you really intend " +
        "to wipe and re-seed this database, re-run with " +
        "ALLOW_DESTRUCTIVE_SEED=true."
    );
  }

  console.warn(
    "WARNING: running a destructive seed against a production environment " +
      "because ALLOW_DESTRUCTIVE_SEED=true was set."
  );
}

async function seed() {
  assertSeedingAllowed();

  await connectDB();

  console.log(
    `Seeding database "${mongoose.connection.name}" ` +
      `(host: ${mongoose.connection.host}) — all existing records in ` +
      `users/teams/tracks/problemstatements will be deleted.`
  );

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
