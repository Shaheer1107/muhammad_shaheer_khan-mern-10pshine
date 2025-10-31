import express from "express";
import fetch from "node-fetch";
const router = express.Router();

const MODEL = "mistralai/Mistral-7B-Instruct-v0.2"; // model repo id

router.post("/generate", async (req, res) => {
  try {
    const { topic, style, max_new_tokens = 200 } = req.body;
    if (!topic) return res.status(400).json({ error: "topic required" });

    // Build a clear instruction prompt
    const prompt = `Write a clear, well-structured note about "${topic}". Keep it medium-length, easily understandable, and suitable for saving as a study note.
    ${style ? `Tone: ${style}.` : ""}`;

    const hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens,
            temperature: 0.2,
            top_p: 0.95
            // you may add: repetition_penalty, do_sample, top_k
          },
          options: { wait_for_model: true } // wait for cold start if needed
        }),
      }
    );

    if (!hfResponse.ok) {
      const txt = await hfResponse.text();
      console.error("HF error:", hfResponse.status, txt);
      return res.status(502).json({ error: "Model inference failed", info: txt });
    }

    const data = await hfResponse.json();
    // Many HF text models return: [{ generated_text: "..." }] OR plain string.
    const generated =
      Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : typeof data === "string"
        ? data
        : data.generated_text ?? JSON.stringify(data);

    // Optionally: save to DB here (call your createNote function)
    // await createNote({ title: topic, content: generated, userId: req.user.id });

    res.json({ note: generated.trim() });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
