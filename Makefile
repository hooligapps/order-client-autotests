.PHONY: build test bootstrap tutor tutor-full report clean

build:
	docker compose build

test:
	docker compose run --rm playwright

bootstrap:
	docker compose run --rm bootstrap

tutor:
	docker compose run --rm tutor

tutor-full:
	docker compose run --rm tutor-full

report:
	docker compose run --rm playwright npx playwright show-report

clean:
	rm -rf playwright-report test-results
