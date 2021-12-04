ARG playwright=v1.16.3-focal

# Playwright Docker documentation: https://playwright.dev/docs/docker/
# Playwright tags: https://mcr.microsoft.com/v2/playwright/tags/list
# Playwright Dockerfile: https://github.com/microsoft/playwright/blob/master/utils/docker/Dockerfile.focal
FROM mcr.microsoft.com/playwright:${playwright}

# Directory structure
RUN mkdir /scriptor /input /script /output

# Installing third-party
RUN pip3 install pywb

# Installing this package
COPY package.json /scriptor/package.json
COPY package-lock.json /scriptor/package-lock.json
COPY bin /scriptor/bin
COPY lib /scriptor/lib
WORKDIR /scriptor
RUN npm install -g .

# Entrypoint

