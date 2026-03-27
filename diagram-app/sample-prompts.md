# Sample Diagram Prompts

## 1 — Orchestrator with tools (original)
```
I want an orchestrator that receives a user query, appends history, applies Azure guardrails, and then decides which component to use from a sentiment tool, summarization tool, or drawing tool. Make the tools red and the classifier green.
```

---

## 2 — RAG pipeline
```
Create a RAG pipeline diagram. A user sends a query that goes into a query embedder. The embedder searches a vector database and retrieves the top documents. Those documents plus the original query are sent to a context builder, which passes a final prompt to an LLM. The LLM response goes through a response validator before being returned to the user. Show the embedder and LLM as tools in red, the vector database as a process node, and the context builder and response validator in green as classifiers.
```

---

## 3 — CI/CD deployment pipeline
```
Draw a CI/CD pipeline. A developer pushes code to a git repository. This triggers a build agent that runs tests. If tests pass, the build artifact goes to a staging deployment. A smoke test classifier checks the staging environment — if it passes, the artifact is promoted to production deployment, if it fails it goes back to the build agent. Show the build agent and deployment steps as tool nodes in red, and the smoke test classifier in green.
```

---

## 4 — Multi-agent customer support system
```
Design a multi-agent customer support system. An incoming customer message hits an intent classifier that decides between three paths: billing, technical support, or general enquiry. Each path has a specialist agent that handles the request. All three agents can escalate to a human handoff node if confidence is low. The intent classifier should be green, the three specialist agents should be red tool nodes, and the human handoff should be a terminal circle.
```
