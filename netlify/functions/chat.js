export async function handler(event) {
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { messages, inventory, dealership } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array is required" }),
      };
    }

    const safeDealership =
      typeof dealership === "string" && dealership.trim()
        ? dealership.trim()
        : "Buick GMC & Chevrolet";

    const safeInventory =
      typeof inventory === "string" && inventory.trim()
        ? inventory.trim()
        : "No inventory data available.";

    const trimmedInventory = safeInventory.length > 18000
      ? `${safeInventory.slice(0, 18000)}\n\n[Inventory truncated for request size safety]`
      : safeInventory;

    const normalizedMessages = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    if (normalizedMessages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No valid messages provided" }),
      };
    }

    const lastUserMessage =
      [...normalizedMessages].reverse().find((m) => m.role === "user")?.content || "";

    const systemPrompt = `You are a friendly, knowledgeable vehicle sales assistant for Quirk ${safeDealership} in Manchester, NH.

You help customers find vehicles from current inventory.

CURRENT INVENTORY DATA:
${trimmedInventory}

RULES:
- Only recommend vehicles that exist in the inventory data above.
- If the customer asks for something like color, model, trim, body style, or price range, use the inventory data to find the closest matches.
- If multiple vehicles match, show up to 5.
- For each suggested vehicle include stock number, year, make, model, trim, exterior color, and MSRP.
- Format MSRP like $45,995.
- If nothing matches exactly, say that clearly and suggest the closest alternatives from inventory.
- Keep the response concise and useful for a small chat widget.
- Never invent inventory.
- Do not answer unrelated general questions. Redirect back to helping find a vehicle.
- Respond directly without filler.`;

    const anthropicPayload = {
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: systemPrompt,
      messages: normalizedMessages,
    };

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error", {
        status: anthropicResponse.status,
        body: errText,
        model: anthropicPayload.model,
        inventoryLength: safeInventory.length,
        messageCount: normalizedMessages.length,
        lastUserMessage,
      });

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "AI service error",
          upstreamStatus: anthropicResponse.status,
          upstreamBody: errText,
        }),
      };
    }

    const data = await anthropicResponse.json();
    const reply =
      Array.isArray(data.content)
        ? data.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("")
        : "";

    if (!reply.trim()) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: "I’m sorry, I couldn’t generate a response. Please try again.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Chat function error:", err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}
