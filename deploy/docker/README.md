# Docker deployment — Studio v0.1.0

The Docker image contains the KHOSAN Studio Web/API shell and durable project persistence API.

It intentionally does **not** contain CUDA, SkinTokens, UniRig, Blender or model checkpoints. GPU production tools remain host/DevSpace workers until a dedicated GPU worker image is validated.

## Build and run

~~~bash
docker compose up --build
~~~

Open:

~~~text
http://127.0.0.1:8080
~~~

Project data is mounted from:

~~~text
./projects -> /data/projects
~~~

## Health

~~~bash
curl http://127.0.0.1:8080/api/health
~~~

## Stop

~~~bash
docker compose down
~~~

## Security boundary

The container:
- binds to localhost by default through Compose,
- exposes no arbitrary shell endpoint,
- writes project state only under the configured projects directory,
- does not contain API keys or secrets,
- does not execute rigging tools.

Remote/team deployment requires authentication and additional hardening before exposing this service beyond a trusted machine.
