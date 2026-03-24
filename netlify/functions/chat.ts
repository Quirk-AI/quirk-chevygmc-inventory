// netlify/functions/chat.ts

exports.handler = async (event: any) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { messages, inventory, dealership } = body;

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "messages array is required" }) };
    }

    const systemPrompt = `You are a friendly, knowledgeable vehicle sales assistant for Quirk ${dealership} in Manchester, NH.

Your job is to help customers find the perfect vehicle from the current inventory. Be warm, conversational, and helpful — like a great salesperson who genuinely wants to help.

CURRENT INVENTORY DATA:
${inventory}

GUIDELINES:
- When a customer describes what they're looking for, search the inventory data and suggest matching vehicles with stock numbers, year, model, trim, color, and MSRP.
- If multiple vehicles match, show the top 3-5 best matches.
- Format prices nicely (e.g., $45,995).
- If asked about features, use your knowledge of the vehicle models to describe them accurately.
- If nothing matches exactly, suggest the closest alternatives and explain why.
- Keep responses concise but informative — this is a chat widget, not a novel.
- Always include the stock number so the customer can reference it.
- If the customer asks about something unrelated to vehicles or the dealership, politely redirect to helping them find a vehicle.
- Never make up vehicles that aren't in the inventory data.
- If inventory data is empty or missing, let the customer know you're having trouble loading inventory and suggest they call the dealership.`;

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages,
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI service error", status: anthropicResponse.status }),
      };
    }

    const data = await anthropicResponse.json();
    const reply =
      data.content
        ?.filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("") || "I'm sorry, I couldn't generate a response.";

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    console.error("Chat function error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
