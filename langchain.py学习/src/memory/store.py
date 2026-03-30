from __future__ import annotations

from collections.abc import Sequence

from langchain_core.messages import BaseMessage

_SESSION_MESSAGES: dict[str, list[BaseMessage]] = {}


def get_messages(session_id: str) -> list[BaseMessage]:
    return list(_SESSION_MESSAGES.get(session_id, []))


def append_messages(session_id: str, new_messages: Sequence[BaseMessage]) -> None:
    if session_id not in _SESSION_MESSAGES:
        _SESSION_MESSAGES[session_id] = []
    _SESSION_MESSAGES[session_id].extend(new_messages)


def clear_messages(session_id: str) -> None:
    _SESSION_MESSAGES.pop(session_id, None)


def get_message_count(session_id: str) -> int:
    return len(_SESSION_MESSAGES.get(session_id, []))
