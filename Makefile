.PHONY: build test smoke release tutor dev dev-smoke dev-tutor prod prod-release report clean

build:
	docker compose build

test:
	docker compose run --rm playwright

smoke:
	docker compose run --rm smoke

release:
	docker compose run --rm release

tutor:
	docker compose run --rm tutor

dev:
	docker compose --profile dev run --rm dev

dev-smoke:
	docker compose --profile dev run --rm dev-smoke

dev-tutor:
	docker compose --profile dev run --rm dev-tutor

prod:
	docker compose --profile prod run --rm prod

prod-release:
	docker compose --profile prod run --rm prod-release

report:
	docker compose run --rm playwright npx playwright show-report

clean:
	rm -rf playwright-report test-results
