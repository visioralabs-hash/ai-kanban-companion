import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task's title, description, priority, status, or due_date",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The task UUID" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          due_date: { type: "string", description: "ISO date string or null" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the board",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          due_date: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by its ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The task UUID" },
        },
        required: ["id"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch tasks for context
    const { data: tasks } = await sb.from("tasks").select("*").order("position");
    const taskSummary = (tasks ?? []).map((t: any) =>
      `- [${t.status}] "${t.title}" (id: ${t.id}, priority: ${t.priority}${t.due_date ? ', due: ' + t.due_date : ''}${t.description ? ', desc: ' + t.description : ''})`
    ).join("\n");

    const systemPrompt = `You are a helpful Kanban board assistant. You help users manage their tasks and projects.

Here are the current tasks on the board:
${taskSummary || "No tasks yet."}

You can help users:
- Understand their task workload
- Suggest priorities and next steps
- Create, update, or delete tasks when asked
- Give productivity tips

When a user asks to edit, update, create, or delete a task, use the appropriate tool. Always confirm what you did after.
Keep answers clear and concise. Use markdown formatting.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Tool-call loop (non-streaming)
    let actionsPerformed: string[] = [];
    let maxIterations = 5;

    while (maxIterations-- > 0) {
      const toolResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          stream: false,
        }),
      });

      if (!toolResp.ok) {
        const status = toolResp.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await toolResp.text();
        console.error("AI error:", status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await toolResp.json();
      const choice = result.choices?.[0];

      if (!choice?.message?.tool_calls?.length) {
        // No tool calls — return the final text as SSE stream
        const text = choice?.message?.content || "Done!";
        const encoder = new TextEncoder();
        const body = new ReadableStream({
          start(controller) {
            // Send as a single SSE chunk
            const data = JSON.stringify({ choices: [{ delta: { content: text } }] });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Process tool calls
      aiMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        const fn = tc.function.name;
        const args = JSON.parse(tc.function.arguments);
        let result = "";

        try {
          if (fn === "update_task") {
            const { id, ...updates } = args;
            const { error } = await sb.from("tasks").update(updates).eq("id", id);
            result = error ? `Error: ${error.message}` : `Updated task "${id}" successfully.`;
            actionsPerformed.push("updated");
          } else if (fn === "create_task") {
            // Get max position
            const status = args.status || "todo";
            const { data: existing } = await sb.from("tasks").select("position").eq("status", status).order("position", { ascending: false }).limit(1);
            const pos = (existing?.[0]?.position ?? -1) + 1;
            const { data, error } = await sb.from("tasks").insert({ ...args, status, position: pos }).select().single();
            result = error ? `Error: ${error.message}` : `Created task "${data.title}" (id: ${data.id}).`;
            actionsPerformed.push("created");
          } else if (fn === "delete_task") {
            const { error } = await sb.from("tasks").delete().eq("id", args.id);
            result = error ? `Error: ${error.message}` : `Deleted task "${args.id}".`;
            actionsPerformed.push("deleted");
          }
        } catch (e: any) {
          result = `Error: ${e.message}`;
        }

        aiMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }

    // Fallback
    return new Response(JSON.stringify({ error: "Too many tool iterations" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
