ARG playwright=v1.16.3-focal

# Playwright Docker documentation: https://playwright.dev/docs/docker/
# Playwright tags: https://mcr.microsoft.com/v2/playwright/tags/list
# Playwright Dockerfile: https://github.com/microsoft/playwright/blob/master/utils/docker/Dockerfile.focal
FROM mcr.microsoft.com/playwright:${playwright}

# Installing third-party
RUN pip3 install pywb

# Directory structure (with default script)
RUN mkdir /scriptor /output
ENV NODE_PATH=/usr/lib/node_modules:/scriptor/node_modules
COPY scripts/Snapshot /script
VOLUME /script /output

# Installing this package
WORKDIR /scriptor
COPY package.json /scriptor/package.json
COPY package-lock.json /scriptor/package-lock.json
RUN npm install --include dev
COPY bin /scriptor/bin
RUN npm install --global
COPY lib /scriptor/lib

# Entrypoint
ENTRYPOINT ["./bin/entrypoint.sh"]

