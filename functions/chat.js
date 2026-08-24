exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "Missing ANTHROPIC_API_KEY on the server." });

  let system, messages;
  try {
    const b = JSON.parse(event.body || "{}");
    system = b.system;
    messages = b.messages;
  } catch (e) {
    return json(400, { error: "Bad request body." });
  }
  if (!system || !Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: "Missing system or messages." });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: system,
        messages: messages.slice(-20),
      }),
    });

    const raw = await r.text();

    if (!r.ok) {
      let msg = raw;
      try { msg = JSON.parse(raw).error.message || raw; } catch (e) {}
      return json(r.status, { error: "API error: " + msg });
    }

    // Pass Anthropic's JSON straight through. The front end reads content[0].text
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: raw };
  } catch (e) {
    return json(500, { error: "Server error: " + (e.message || "unknown") });
  }
};

function json(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}
