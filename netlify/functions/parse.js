// Proxies the transcript-parsing request to the Anthropic API so the API key
// never reaches the browser. The client sends { system, messages, max_tokens };
// the model is chosen here (override with the ANTHROPIC_MODEL env var).

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const body = {
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: payload.max_tokens || 1500,
    system: payload.system,
    messages: payload.messages || [],
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e) }) };
  }
};
