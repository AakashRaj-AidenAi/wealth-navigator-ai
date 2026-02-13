"""Agent tool system with decorator-based registration."""
import json
import inspect
import logging
from typing import Any, Callable
from functools import wraps

logger = logging.getLogger(__name__)

# Global tool registry
_tool_registry: dict[str, dict] = {}

def tool(name: str, description: str, parameters: dict | None = None):
    """Decorator to register a function as an agent tool.

    Usage:
        @tool(name="get_client", description="Fetch client by ID", parameters={...})
        async def get_client(client_id: str, db: AsyncSession) -> dict:
            ...
    """
    def decorator(func: Callable) -> Callable:
        # Auto-generate parameters schema from function signature if not provided
        if parameters is None:
            params = _infer_parameters(func)
        else:
            params = parameters

        # Register in global registry
        _tool_registry[name] = {
            "function": func,
            "name": name,
            "description": description,
            "parameters": params,
        }

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        wrapper._tool_name = name
        return wrapper
    return decorator

def _infer_parameters(func: Callable) -> dict:
    """Infer JSON Schema parameters from function type hints."""
    sig = inspect.signature(func)
    properties = {}
    required = []

    for param_name, param in sig.parameters.items():
        if param_name in ("db", "session", "self", "cls"):
            continue  # Skip injected dependencies

        type_map = {str: "string", int: "integer", float: "number", bool: "boolean"}
        annotation = param.annotation
        json_type = type_map.get(annotation, "string")

        properties[param_name] = {"type": json_type, "description": param_name}
        if param.default is inspect.Parameter.empty:
            required.append(param_name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }

def get_tool_definitions(tool_names: list[str]) -> list[dict]:
    """Get OpenAI function calling tool definitions for specified tools."""
    definitions = []
    for name in tool_names:
        if name in _tool_registry:
            t = _tool_registry[name]
            definitions.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                }
            })
    return definitions

async def execute_tool(name: str, arguments: str | dict, **kwargs) -> Any:
    """Execute a registered tool by name with given arguments."""
    if name not in _tool_registry:
        raise ValueError(f"Unknown tool: {name}")

    if isinstance(arguments, str):
        arguments = json.loads(arguments)

    func = _tool_registry[name]["function"]
    # Merge kwargs (like db session) with parsed arguments
    all_args = {**arguments, **kwargs}
    return await func(**all_args)

def get_all_tools() -> dict[str, dict]:
    """Return the full tool registry."""
    return _tool_registry.copy()
