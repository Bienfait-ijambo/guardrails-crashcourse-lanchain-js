
// 4. Fault Tolerance and Execution Limits


// Cover runtime protection mechanisms like run limits (modelCallLimitMiddleware) 
// to prevent infinite tool loops and excessive token spend.


import { createAgent, modelCallLimitMiddleware ,toolCallLimitMiddleware} from "langchain";


const productionAgent = createAgent({
  model: "openai:gpt-5.5",
  tools: [calculateTax],
  middleware: [
    modelCallLimitMiddleware({ runLimit: 25 }),
    toolCallLimitMiddleware({
       toolName: "search",
      runLimit: 10,    
      exitBehavior: "continue", // Default behavior when limit is hit
    })
  ],
});


