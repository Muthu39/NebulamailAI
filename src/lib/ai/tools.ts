import { z } from "zod";

export const toolSchemas = {
  navigate_to_view: z.object({ view: z.enum(["inbox", "sent", "compose"]) }),
  open_email: z.object({ emailId: z.string().min(1) }),
  search_emails: z.object({ sender: z.string().optional(), keyword: z.string().optional(), after: z.string().optional(), before: z.string().optional(), unread: z.boolean().optional() }),
  open_compose: z.object({ to: z.string().optional(), subject: z.string().optional(), body: z.string().optional(), mode: z.enum(["new", "reply", "forward"]).default("new") }),
  send_email: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
  reply_to_email: z.object({ emailId: z.string().optional(), body: z.string().optional() }),
};

export type ToolName = keyof typeof toolSchemas;

const toolParameters: Record<ToolName, Record<string, unknown>> = {
  navigate_to_view: { type: "object", properties: { view: { type: "string", enum: ["inbox", "sent", "compose"] } }, required: ["view"], additionalProperties: false },
  open_email: { type: "object", properties: { emailId: { type: "string" } }, required: ["emailId"], additionalProperties: false },
  search_emails: { type: "object", properties: { sender: { type: "string" }, keyword: { type: "string" }, after: { type: "string" }, before: { type: "string" }, unread: { type: "boolean" } }, additionalProperties: false },
  open_compose: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" }, mode: { type: "string", enum: ["new", "reply", "forward"] } }, additionalProperties: false },
  send_email: { type: "object", properties: { to: { type: "string", format: "email" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"], additionalProperties: false },
  reply_to_email: { type: "object", properties: { emailId: { type: "string" }, body: { type: "string" } }, additionalProperties: false },
};

export const openAiTools = Object.entries(toolSchemas).map(([name]) => ({
  type: "function" as const,
  function: {
    name,
    description: `Use the ${name} application action. Never claim it ran until the app returns success.`,
    parameters: toolParameters[name as ToolName],
  },
}));
