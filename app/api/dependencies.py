from functools import lru_cache


# The agent (and with it the database engine and LLM client) is imported
# lazily so the API can be imported -- and tested with dependency overrides --
# without a configured DATABASE_URL or OpenRouter key.

@lru_cache
def get_agent():
    from app.agents.agent import agent

    return agent
