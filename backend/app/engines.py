"""Generation engine abstraction for Personal Video AI."""

from dataclasses import dataclass
from typing import Any, Protocol

from .comfyui import queue_generation


@dataclass(frozen=True)
class GenerationOptions:
    prompt: str
    seed: int | None = None
    video_format: str = "landscape"
    duration_seconds: int = 2
    start_image: str | None = None
    quality: str = "detailed"


class GenerationEngine(Protocol):
    id: str
    name: str

    async def generate(self, options: GenerationOptions) -> dict[str, Any]: ...


class WanEngine:
    id = "wan"
    name = "Wan 2.2"

    async def generate(self, options: GenerationOptions) -> dict[str, Any]:
        return await queue_generation(
            options.prompt,
            options.seed,
            options.video_format,
            options.duration_seconds,
            options.start_image,
            options.quality,
        )


_ENGINES: dict[str, GenerationEngine] = {
    "wan": WanEngine(),
}


def list_engines() -> list[dict[str, Any]]:
    return [
        {"id": "auto", "name": "Auto", "available": True},
        *[{"id": engine.id, "name": engine.name, "available": True} for engine in _ENGINES.values()],
        {"id": "ltx", "name": "LTX", "available": False},
        {"id": "hunyuan", "name": "HunyuanVideo", "available": False},
    ]


def get_engine(engine_id: str) -> GenerationEngine:
    # Milestone 003 starts with Wan as the only installed engine. Auto is
    # intentionally routed through the manager so selection can evolve later.
    selected = "wan" if engine_id == "auto" else engine_id
    engine = _ENGINES.get(selected)
    if engine is None:
        raise ValueError(f"Le moteur '{engine_id}' n'est pas encore disponible.")
    return engine
