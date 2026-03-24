// src/components/ChatBubble.tsx
import { FC, useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Search } from "lucide-react";
import { useInventoryStore } from "../store/inventoryStore";
import { INVENTORY_PATHS } from "../services/inventoryService";
import * as XLSX from "xlsx";
import { DealerSource, InventoryRow } from "../types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Converts inventory rows to a compact text summary for the AI
function inventoryToText(rows: InventoryRow[]): string {
  if (!rows.length) return "No inventory data available.";

  const lines = rows.map(
    (r) =>
      `Stock#${r["Stock Number"]} | ${r.Year} ${r.Make} ${r.Model} ${r.Trim} | ${r["Exterior Color"]} | MSRP: $${r.MSRP.toLocaleString()} | Status: ${r.Status || r.Category || "In Stock"} | VIN: ${r.VIN}`
  );

  return `Total vehicles: ${rows.length}\n\n${lines.join("\n")}`;
}

// Parse a single XLSX file into InventoryRow[]
async function parseInventoryFile(path: string): Promise<InventoryRow[]> {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to fetch ${path}`);
  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No worksheet");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return raw
    .filter((r) => r["Stock Number"] != null && String(r["Stock Number"]).trim() !== "")
    .map((r) => ({
      "Stock Number": String(r["Stock Number"] ?? ""),
      Year: Number(r["Year"]) || 0,
      Make: String(r["Make"] ?? ""),
      Model: String(r["Model"] ?? ""),
      "Exterior Color": String(r["Exterior Color"] ?? ""),
      Trim: String(r["Trim"] ?? ""),
      "Model Number": String(r["Model Number"] ?? ""),
      Cylinders: Number(r["Cylinders"]) || 0,
      Age: Number(r["Age"]) || 0,
      MSRP: Number(r["MSRP"]) || 0,
      Status: String(r["Category"] ?? ""),
      VIN: String(r["VIN"] ?? ""),
      Body: String(r["Body"] ?? ""),
      "Body Type": String(r["Body Type"] ?? ""),
      Category: String(r["Category"] ?? ""),
    }));
}

export const ChatBubble: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryText, setInventoryText] = useState("");
  const [inventoryLoaded, setInventoryLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load and merge BOTH inventory XLSX files for the AI context
  const loadAllInventory = useCallback(async () => {
    try {
      const [chevyRows, gmcRows] = await Promise.all([
        parseInventoryFile(INVENTORY_PATHS["chevrolet"]),
        parseInventoryFile(INVENTORY_PATHS["buick-gmc"]),
      ]);
      const allRows = [...chevyRows, ...gmcRows];
      setInventoryText(inventoryToText(allRows));
      setInventoryLoaded(true);
    } catch (err) {
      console.error("Chat: inventory load error", err);
      setInventoryText("Inventory data could not be loaded.");
      setInventoryLoaded(true);
    }
  }, []);

  // Load inventory when chat opens
  useEffect(() => {
    if (isOpen && !inventoryLoaded) {
      loadAllInventory();
    }
  }, [isOpen, inventoryLoaded, loadAllInventory]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!inventoryLoaded) {
      loadAllInventory();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          inventory: inventoryText,
          dealership: "Buick GMC & Chevrolet",
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simple markdown-ish formatting for assistant messages
  const formatMessage = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold
      const formatted = line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold">$1</strong>'
      );
      return (
        <span key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </span>
      );
    });
  };

  return (
    <>
      {/* Chat Window */}
      <div
        className={`fixed bottom-16 right-4 sm:right-6 z-50 transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
        style={{ width: "min(380px, calc(100vw - 2rem))" }}
      >
        <div
          className="rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
          style={{
            height: "min(520px, calc(100vh - 10rem))",
            background: "var(--card-bg, hsl(var(--card)))",
            borderColor: "var(--border-color, hsl(var(--border)))",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--chevy-blue, #0066B1), var(--chevy-blue-dark, #004d86))",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm leading-tight">
                  Quirk Buick GMC & Chevrolet
                </div>
                <div className="text-white/70 text-xs">
                  Vehicle Search Assistant
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{
              background: "var(--bg-secondary, hsl(var(--secondary) / 0.3))",
            }}
          >
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex gap-2.5">
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "var(--chevy-blue, #0066B1)" }}
                >
                  <MessageCircle size={13} className="text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed"
                  style={{
                    background: "var(--card-bg, hsl(var(--card)))",
                    color: "var(--text-primary, hsl(var(--foreground)))",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  What type of vehicle are you looking for today? I can search
                  both dealership inventories to find the perfect match for you!
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "var(--chevy-blue, #0066B1)" }}
                  >
                    <MessageCircle size={13} className="text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm"
                      : "rounded-tl-sm"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--chevy-blue, #0066B1)",
                          color: "#ffffff",
                        }
                      : {
                          background: "var(--card-bg, hsl(var(--card)))",
                          color: "var(--text-primary, hsl(var(--foreground)))",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }
                  }
                >
                  {msg.role === "assistant"
                    ? formatMessage(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {isLoading && (
              <div className="flex gap-2.5">
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "var(--chevy-blue, #0066B1)" }}
                >
                  <MessageCircle size={13} className="text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm px-4 py-3"
                  style={{
                    background: "var(--card-bg, hsl(var(--card)))",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="flex gap-1.5 items-center">
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: "var(--chevy-blue, #0066B1)",
                        animationDelay: "0ms",
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: "var(--chevy-blue, #0066B1)",
                        animationDelay: "150ms",
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: "var(--chevy-blue, #0066B1)",
                        animationDelay: "300ms",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="shrink-0 px-3 py-2.5 border-t"
            style={{ borderColor: "var(--border-color, hsl(var(--border)))" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-3.5 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-tertiary, hsl(var(--muted)))",
                  color: "var(--text-primary, hsl(var(--foreground)))",
                  maxHeight: "80px",
                  minHeight: "38px",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 80) + "px";
                }}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{
                  background: "var(--chevy-blue, #0066B1)",
                  color: "#ffffff",
                }}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tap-to-search banner */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="fixed bottom-4 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, var(--chevy-blue, #0066B1), var(--chevy-blue-dark, #004d86))",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <Search size={18} className="text-white shrink-0" />
        <span className="text-white text-sm font-medium whitespace-nowrap">
          {isOpen ? "Close search assistant" : "Tap here to let me help you search"}
        </span>
      </button>
    </>
  );
};
