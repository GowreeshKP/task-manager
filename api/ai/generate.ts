import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title } = req.body;
  if (!title?.trim()) {
    return res
      .status(400)
      .json({ error: "A task title is required to generate a description" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const useGemini = geminiKey?.startsWith("AIza");
  const useOpenRouter = openRouterKey?.startsWith("sk-or-v1-");

  if (!useGemini && !useOpenRouter) {
    return res.status(503).json({
      error:
        "AI is not configured. Add a GEMINI_API_KEY or OPENROUTER_API_KEY to your Vercel environment variables.",
    });
  }

  const prompt = `Write a professional, action-oriented, concise task description for: "${title}".
Keep it to 3 sentences or fewer. Use basic HTML tags (<strong>, <p>, <ul>/<li>). Return only valid HTML, no markdown fences.`;

  try {
    let htmlContent = "";

    if (useGemini) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": geminiKey!,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as any;
        return res
          .status(502)
          .json({ error: `Gemini API error: ${err?.error?.message || response.status}` });
      }
      htmlContent =
        (await response.json() as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (useOpenRouter) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": process.env.APP_URL || "https://your-app.vercel.app",
          "X-Title": "Task Manager AI",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as any;
        const code = err?.error?.code;
        if (code === 429 || response.status === 429) {
          const wait = Math.ceil(err?.error?.metadata?.retry_after_seconds ?? 30);
          return res
            .status(429)
            .json({ error: `AI rate-limited. Please wait ${wait}s and try again.` });
        }
        return res
          .status(502)
          .json({ error: `OpenRouter error: ${err?.error?.message || response.status}` });
      }
      htmlContent = (await response.json() as any)?.choices?.[0]?.message?.content || "";
    }

    if (!htmlContent) {
      return res
        .status(502)
        .json({ error: "AI returned an empty response. Please try again." });
    }

    // Strip markdown fences if model wrapped the output
    htmlContent = htmlContent
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");

    return res.json({ description: htmlContent.trim() });
  } catch (err: any) {
    return res.status(500).json({ error: "AI generation failed. Please try again." });
  }
}
