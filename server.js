const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const MASTERS_URL = "https://www.masters.com/en_US/scores/feeds/2026/scores.json";

let cache = { data: null, lastUpdated: null };

async function fetchScores() {
  try {
    const res = await fetch(MASTERS_URL);
    const text = await res.text();
    // Masters feed has a JS-style prefix, strip it if present
    const clean = text.replace(/^[^{]*/, "");
    const json = JSON.parse(clean);
    const players = json.data.player.map(p => {
      const scoreStr = p.topar;
      let scoreNum = 0;
      if (scoreStr === "E" || scoreStr === "" || scoreStr === null) scoreNum = 0;
      else scoreNum = parseInt(scoreStr) || 0;

      const cut = p.status === "C" || p.newStatus === "C";
      const thru = p.thru ? (p.thru === "F" ? 18 : parseInt(p.thru)) : null;

      return {
        name: p.full_name,
        score: scoreStr === "" ? "E" : scoreStr,
        scoreNum,
        cut,
        thru,
        status: p.status
      };
    });

    cache = { data: players, lastUpdated: new Date().toISOString() };
    console.log(`Scores updated: ${cache.lastUpdated} — ${players.length} players`);
  } catch (err) {
    console.error("Error fetching scores:", err.message);
  }
}

fetchScores();
setInterval(fetchScores, 30000);

app.get("/scores", (req, res) => {
  if (!cache.data) return res.status(503).json({ error: "Scores not yet available" });
  res.json({ players: cache.data, lastUpdated: cache.lastUpdated });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
