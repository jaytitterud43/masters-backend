const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const MASTERS_URL = "https://www.masters.com/en_US/scores/feeds/2026/scores.json";

let cache = { data: null, lastUpdated: null };

async function fetchScores() {
  try {
    console.log("Fetching scores from Masters...");
    const res = await fetch(MASTERS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.masters.com/"
      }
    });
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response preview:", text.substring(0, 200));
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
    console.error(err.stack);
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
