FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

COPY package.json tsconfig.json playwright.config.ts ./
COPY .env.example ./
COPY docker/env/autotest_env ./.env
COPY src ./src
COPY tests ./tests

RUN npm install

CMD ["npx", "playwright", "test"]
