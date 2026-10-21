
import { tool, createAgent } from "langchain";
import * as z from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

import "dotenv/config";


const refundTool = tool(
  async ({ accountId, amount }) => {
    try {
      return `✅ [SUCCESS] Refund of $${amount} successfully processed for account ${accountId}.`;
    } catch (error) {
      console.log("FAILED TO PROCESS REFUNDS");
    }
  },
  {
    name: "process_refund",
    description: "Process a customer refund",
    schema: z.object({
      accountId: z.string() .regex(/^ACC-\d{5}/, { message: "Must match format ACC-XXX=XX" }),
      amount: z.number().min(0.01, { message: "Amount must be greater than 0" }).max(250.0, { message: "Automatic refunds cannot exceed $250.00" }),
    }),
  }
);



const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const agent = createAgent({
  systemPrompt: `
  You are E-commerce Agent with access to standard number of tools 
  Tools: 1. process_refund : use this tool to process refund
  `,
  model:llm,
  tools: [refundTool]
});






async function runCourseDemo() {
 
 
  // console.log("--- 🟩 CASE 1: Valid User Intent ---");
  
  try {
    const response = await agent.invoke({
      messages: [{ role: "user", content: `Please process a refund of \$150.00 for account ACC-12345.` }],
    });
    console.log(`Agent response::///`,response);
  } catch (error) {
    console.error("Agent failed unexpected:", error);
  }



  // console.log("--- 🟥 CASE 2: Malicious Input (Schema Boundary Breach) ---");

  try {
    const response = await agent.invoke({
      messages: [{ role: "user", content: `hey, process a refund of \$10000.000.00 for account B452344AD-USER-99.` }],
    });
    

    console.log("AGENT RESPONSE 2 ::/// ", response)
  
  } catch (error) {
    console.log("❌ Catch Block Triggered (Deterministic Fail):", error);
  }
}

runCourseDemo()