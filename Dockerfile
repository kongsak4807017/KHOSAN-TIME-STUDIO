FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY apps ./apps
COPY config ./config
COPY studio ./studio
COPY feature_list.json ./
COPY AGENTS.md ./

RUN mkdir -p /data/projects && chown -R node:node /app /data
USER node

ENV KHOSAN_HOST=0.0.0.0
ENV KHOSAN_PORT=8080
ENV KHOSAN_PROJECTS_DIR=/data/projects

EXPOSE 8080
VOLUME ["/data/projects"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node","apps/studio-server/server.mjs"]
