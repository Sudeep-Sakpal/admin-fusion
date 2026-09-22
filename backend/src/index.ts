import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`Backend server running on http://localhost:${env.port}`);
});

connectDB().catch((err) => {
  console.error(
    "MongoDB connection failed, server is running without a database connection:",
    (err as Error).message
  );
});
