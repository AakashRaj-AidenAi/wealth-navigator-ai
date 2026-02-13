"""OpenAI API client wrapper with streaming, function calling, retry logic."""
import asyncio
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Singleton client
_client: AsyncOpenAI | None = None

def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

async def chat_completion(
    messages: list[dict],
    model: str = "gpt-4o",
    tools: list[dict] | None = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    stream: bool = False,
) -> dict | AsyncGenerator:
    """Call OpenAI chat completions with retry logic.

    Returns:
        If stream=False: the complete response dict
        If stream=True: an async generator yielding chunks
    """
    client = get_openai_client()

    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    # Retry with exponential backoff
    for attempt in range(3):
        try:
            response = await client.chat.completions.create(**kwargs)
            if stream:
                return response  # Return the async stream
            return response
        except Exception as e:
            if attempt == 2:
                logger.error(f"OpenAI API failed after 3 attempts: {e}")
                raise
            wait = 2 ** attempt
            logger.warning(f"OpenAI API attempt {attempt+1} failed, retrying in {wait}s: {e}")
            await asyncio.sleep(wait)

async def stream_chat_completion(
    messages: list[dict],
    model: str = "gpt-4o",
    tools: list[dict] | None = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> AsyncGenerator[dict, None]:
    """Stream chat completion tokens."""
    stream = await chat_completion(
        messages=messages,
        model=model,
        tools=tools,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta:
            yield {
                "content": chunk.choices[0].delta.content,
                "tool_calls": chunk.choices[0].delta.tool_calls,
                "finish_reason": chunk.choices[0].finish_reason,
            }
