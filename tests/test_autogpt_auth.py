from __future__ import annotations

import uuid

from agentprobe.endpoints.autogpt_auth import default_user_id, forge_jwt


def test_default_user_id_is_uuid() -> None:
    parsed = uuid.UUID(default_user_id())
    assert str(parsed)


def test_forge_jwt_preserves_uuid_subject() -> None:
    user_id = str(uuid.uuid4())
    token = forge_jwt(
        user_id=user_id,
        email="agentprobe@example.com",
        jwt_secret="test-secret",
        jwt_algorithm="HS256",
        issuer="supabase-demo",
        audience="authenticated",
        role="user",
        name="AgentProbe User",
    )

    assert isinstance(token, str)
