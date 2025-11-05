import express from "express";
import fetch from "node-fetch";
const router = express.Router();

// Using a highly reliable model from Hugging Face Serverless
const MODEL = "HuggingFaceH4/zephyr-7b-beta";
const HF_API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 5) {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1}/${maxRetries}...`);
      const response = await fetch(url, options);
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (response.ok) {
        console.log("✅ Request successful");
        return response;
      }
      
      const errorText = await response.text();
      console.log(`⚠️ Error response:`, errorText.substring(0, 300));
      
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { error: errorText };
      }
      
      // Handle model loading - be patient
      if (errorJson.error?.includes("loading") || errorJson.error?.includes("currently loading") || errorJson.estimated_time) {
        const waitTime = Math.min(errorJson.estimated_time || 20, 40);
        console.log(`⏳ Model is loading... waiting ${waitTime}s (this is normal for first request)`);
        
        if (i < maxRetries - 1) {
          await sleep(waitTime * 1000);
          continue;
        }
      }
      
      // Handle rate limiting
      if (errorJson.error?.includes("rate limit") || response.status === 429) {
        console.log("⏳ Rate limited, waiting 10s...");
        if (i < maxRetries - 1) {
          await sleep(10000);
          continue;
        }
      }
      
      lastError = errorJson;
      
      // Exponential backoff
      if (i < maxRetries - 1) {
        const waitTime = Math.min(Math.pow(2, i) * 2000, 15000);
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await sleep(waitTime);
      }
      
    } catch (fetchError) {
      console.error(`❌ Fetch error:`, fetchError.message);
      lastError = { error: fetchError.message };
      
      if (i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 2000);
      }
    }
  }
  
  throw new Error(lastError?.error || "All retry attempts failed");
}

router.post("/generate", async (req, res) => {
  try {
    const { topic, style, max_new_tokens = 250 } = req.body;
    
    if (!topic?.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error("❌ HUGGINGFACE_API_KEY not found");
      return res.status(500).json({ 
        error: "API key not configured. Please add HUGGINGFACE_API_KEY to your .env file." 
      });
    }

    console.log("\n🤖 === Starting AI Generation ===");
    console.log("📝 Topic:", topic);
    console.log("🎨 Style:", style || "default");
    console.log("🔑 API Key:", process.env.HUGGINGFACE_API_KEY.substring(0, 10) + "...");
    console.log("🤖 Model:", MODEL);

    // Zephyr uses a chat format
    let systemMessage = "You are a helpful assistant that writes clear, informative notes.";
    let userMessage = "";
    
    const styleInstructions = {
      formal: "Write a formal, professional note",
      casual: "Write a casual, friendly note",
      detailed: "Write a detailed, comprehensive note with important details",
      simple: "Write a simple, easy-to-understand note",
      technical: "Write a technical note with relevant technical details",
      creative: "Write a creative, engaging note that's interesting to read",
    };
    
    const instruction = styleInstructions[style] || "Write a clear and informative note";
    userMessage = `${instruction} about ${topic}. Keep it between 150-250 words.`;
    
    // Zephyr format
    const prompt = `<|system|>\n${systemMessage}</s>\n<|user|>\n${userMessage}</s>\n<|assistant|>`;
    
    console.log("📤 Prompt length:", prompt.length);

    const requestBody = {
      inputs: prompt,
      parameters: {
        max_new_tokens: Math.min(max_new_tokens, 400),
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false,
        stop: ["</s>", "<|user|>", "<|system|>"]
      },
      options: { 
        wait_for_model: true,
        use_cache: false,
      },
    };

    console.log("📦 Sending request to Hugging Face...");
    console.log("⏳ First request may take 20-40s while model loads...");

    const hfResponse = await fetchWithRetry(
      HF_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      5 // 5 retries to handle loading time
    );

    console.log("📥 Reading response...");
    const data = await hfResponse.json();
    console.log("📥 Response type:", Array.isArray(data) ? "array" : typeof data);

    let generated = "";
    
    // Handle response formats
    if (Array.isArray(data) && data.length > 0) {
      if (data[0]?.generated_text) {
        generated = data[0].generated_text;
      } else if (typeof data[0] === 'string') {
        generated = data[0];
      }
    } else if (data?.generated_text) {
      generated = data.generated_text;
    } else if (typeof data === 'string') {
      generated = data;
    }

    if (!generated) {
      console.error("❌ Unexpected response format:", JSON.stringify(data).substring(0, 200));
      return res.status(500).json({ 
        error: "Could not parse AI response. Please try again.",
      });
    }

    // Clean up
    generated = generated.trim();
    
    // Remove chat format markers
    generated = generated.replace(/<\|.*?\|>/g, '').trim();
    generated = generated.replace(/<\/s>/g, '').trim();
    
    // Remove meta instructions if present
    const cleanPatterns = [
      /^(Here is|Here's|Sure,?) (a|an|the)? ?(note|text)?:?\s*/i,
      /^(Okay,?|Alright,?) /i,
    ];
    
    for (const pattern of cleanPatterns) {
      generated = generated.replace(pattern, '');
    }

    generated = generated.trim();

    if (!generated || generated.length < 30) {
      console.error("❌ Generated text too short:", generated);
      return res.status(500).json({ 
        error: "Generated content is too short. Please try again.",
      });
    }

    // Truncate at sentence if too long
    if (generated.length > 1200) {
      generated = generated.substring(0, 1200);
      const lastPeriod = generated.lastIndexOf('.');
      if (lastPeriod > 600) {
        generated = generated.substring(0, lastPeriod + 1);
      }
    }

    console.log("✅ Generated:", generated.length, "characters");
    console.log("📄 First 120 chars:", generated.substring(0, 120) + "...");
    console.log("=== Generation Complete ===\n");

    res.json({ note: generated });

  } catch (err) {
    console.error("\n💥 Error:", err.message);
    
    // Provide helpful error messages
    let userMessage = "Failed to generate note. ";
    
    if (err.message.includes("loading")) {
      userMessage += "The AI model is starting up. Please try again in 30 seconds.";
    } else if (err.message.includes("rate limit")) {
      userMessage += "Rate limit reached. Please wait a moment and try again.";
    } else {
      userMessage += "Please try again or try a different topic.";
    }
    
    res.status(500).json({ 
      error: userMessage,
      technical: err.message 
    });
  }
});

// Health check
router.get("/health", async (req, res) => {
  const hasApiKey = !!process.env.HUGGINGFACE_API_KEY;
  
  if (!hasApiKey) {
    return res.json({ 
      status: "error",
      model: MODEL,
      apiConfigured: false,
      message: "API key not configured"
    });
  }
  
  res.json({ 
    status: "ok",
    model: MODEL,
    apiUrl: HF_API_URL,
    apiConfigured: true,
    message: "Configuration looks good. Note: First AI generation may take 20-40s while model loads."
  });
});

export default router;