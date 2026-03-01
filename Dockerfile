FROM quay.io/qasimtech/mega-bot:latest

WORKDIR /app

COPY package.json ./

ARG PKG_MANAGER=npm
RUN $PKG_MANAGER install --legacy-peer-deps

COPY . .

RUN $PKG_MANAGER run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
