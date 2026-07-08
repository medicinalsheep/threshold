FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY server.js ./
ENV PORT=9000
ENV PEER_PATH=/peerjs
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:9000/health || exit 1
CMD ["node", "server.js"]