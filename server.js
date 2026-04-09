const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const ESPN_URL = "https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=401703513";
let cache = { data: null, lastUpdated: null };

async function fetchScores() {
  try {
    const res = await fetch(ESPN_URL);
    const json = await res.json();
    const competitors = json?.events?.[0]?.competitions?.[0]?.competitors ?? [];

    const players = competitors.map((c) => {
      const name = c.athlete?.displayName ?? "Unknown";
      const score = c.score?.displayValue ?? "E";
      const toPar = c.linescores ? c.statistics?.find(s => s.name === "toPar")?.displayValue ?? score : score;
      const status = c.status?.type?.description ?? "active";
      const position = c.status?.position?.displayName ?? c.sortOrder?.toString() ?? "";
      const thru = c.status?.thru ?? null;
      const round = c.status?.period ?? 1;
      const cut = status.toLowerCase().includes("cut");

      // Parse score to number for sorting
      let scoreNum = 0;
      const raw = c.statistics?.find(s => s.name === "toPar")?.displayValue ?? score;
      if (raw === "E" || raw === "Even") scoreNum = 0;
      else scoreNum = parseInt(raw) || 0;

      return { name, score: raw, scoreNum, status, position, thru, round, cut };
    });

    cache = { data: players, lastUpdated: new Date().toISOString() };
    console.log(`Scores updated: ${cache.lastUpdated}`);
  } catch (err) {
    console.error("Error fetching scores:", err.message);
  }
}

// Fetch immediately and then every 30 seconds
fetchScores();
setInterval(fetchScores, 30000);

app.get("/scores", (req, res) => {
  if (!cache.data) return res.status(503).json({ error: "Scores not yet available" });
  res.json({ players: cache.data, lastUpdated: cache.lastUpdated });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
