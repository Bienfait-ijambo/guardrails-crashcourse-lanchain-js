import { createAgent, piiMiddleware } from "langchain"; 
import { tool } from "@langchain/core/tools"; 
import * as z from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

import "dotenv/config";


const mainModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});


const agent = createAgent({
  model: mainModel,
  middleware: [
    // Redact emails in user input before sending to model
    piiMiddleware("email", {
      strategy: "redact",
      applyToInput: true,
    }),
    // Mask credit cards in user input
    piiMiddleware("credit_card", {
      strategy: "mask",
      applyToInput: true,
    }),
    // Block API keys - raise error if detected
    piiMiddleware("api_key", {
      detector: /sk-[a-zA-Z0-9]{32}/,
      strategy: "block",
      applyToInput: true,
    }),
  ],
});

// When user provides PII, it will be handled according to the strategy
const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "My email is john.doe@example.com and card is 5105-1051-0510-5100"
  }]
});




console.log("AGENT RESULT::::///",result)

