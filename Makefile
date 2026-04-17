-include .env

VERSION := $(shell cat VERSION)
PUBLISHEDIMAGE := $(shell cat PUBLISHED)

build-base:
	docker build -f Dockerfile.base --build-arg "NPM_TOKEN=${NPM_TOKEN}" --build-arg -t informatievlaanderen/codelijsten-generator-base:${VERSION} .

build-base-linux:
	docker build -f Dockerfile.base --build-arg "NPM_TOKEN=${NPM_TOKEN}" --build-arg --build-arg --platform=linux/amd64 -t informatievlaanderen/codelijsten-generator-base:${VERSION} .

# first build-base should have been run
build:
	docker build -f Dockerfile.build --build-arg "VERSION=${VERSION}" -t informatievlaanderen/codelijsten-generator:${VERSION} .

# first build-base-linux should have been run
build-linux:
	docker build -f Dockerfile.build --platform=linux/amd64 --build-arg "VERSION=${VERSION}" -t informatievlaanderen/codelijsten-generator:${VERSION} .

exec:
	docker run -it --rm --name codelijsten-generator -p 3000:3000 informatievlaanderen/codelijsten-generator:${VERSION} sh

run:
	docker run -d --rm --name codelijsten-generator -p 3000:3000 informatievlaanderen/codelijsten-generator:${VERSION}

stop:
	docker stop codelijsten-generator

publish:
	docker tag informatievlaanderen/codelijsten-generator:${VERSION} ${PUBLISHEDIMAGE}:${VERSION}
	docker push ${PUBLISHEDIMAGE}:${VERSION}

