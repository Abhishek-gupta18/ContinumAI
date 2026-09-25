require("dotenv").config();

const express = require("express");
const { handleChatRequest } = require("./routes/chat");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/chat", handleChatRequest);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`ContinumAI gateway running on port ${port}`);
});