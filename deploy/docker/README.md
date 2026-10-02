# Docker deployment — Studio v0.2.0

The Docker image contains the KHOSAN Studio Web/API shell, Project Library/active-project APIs and durable project persistence.

It intentionally does **not** contain CUDA, SkinTokens, UniRig, Blender or model checkpoints. GPU production tools remain host/DevSpace workers until a dedicated GPU worker image is validated.

## Build and run

~~~bash
docker compose up --build
~~~

Open:

~~~text
http://127.0.0.1:8080
~~~

Project Library + game-project data are mounted from:

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
- writes Project Library and project state only under the configured projects directory,
- does not contain API keys or secrets,
- does not execute rigging tools.

Remote/team deployment requires authentication and additional hardening before exposing this service beyond a trusted machine.


## Workspace smoke test

Run outside or inside an appropriate Node environment before acceptance:

~~~bash
npm run verify:workspace
~~~

The test uses a temporary project root and verifies two isolated projects, switching, project-aware routing and persistence across restart.
