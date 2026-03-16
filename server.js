import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post("/api/analyze", async (req, res) => {

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Analyze this VA claim evidence and summarize important medical findings:\n\n${text}`
        }
      ]
    });

    res.json({
      result: msg.content[0].text
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
