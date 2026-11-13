from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware
from langchain_openrouter import ChatOpenRouter
from langgraph.checkpoint.memory import InMemorySaver
from app.tools.agent_tools import AgentTools
from app.prompts.prompt_loader import load_prompt
import inspect

load_dotenv()
checkpointer = InMemorySaver()
agent_tools = AgentTools()
system_prompt = load_prompt("vehicle_assistant.md")

model = ChatOpenRouter(
    model="nvidia/nemotron-3.5-lightning:free",
    base_url="https://openrouter.ai/api/v1",
    temperature=0,
    streaming=True,
)

agent = create_agent(
    model=model,
    tools=agent_tools.get_tools(),
    system_prompt=system_prompt,
    middleware=[
        ModelCallLimitMiddleware(
            run_limit=5,
            thread_limit=7,
            exit_behavior="error",
        )
    ],
    checkpointer=checkpointer,
)
