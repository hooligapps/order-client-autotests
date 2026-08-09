.PHONY: build test bootstrap tutor tutor-full dev dev-tutor prod report clean

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

dev:
	docker compose --profile dev run --rm dev

dev-tutor:
	docker compose --profile dev run --rm dev-tutor

prod:
	docker compose --profile prod run --rm prod

report:
	docker compose run --rm playwright npx playwright show-report

clean:
	rm -rf playwright-report test-results
