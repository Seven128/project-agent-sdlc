.PHONY: build test validate-context check-source
build:
	npm run build
test:
	npm test
validate-context:
	node packages/ty-context/dist/cli.js validate-context
check-source:
	node packages/ty-context/dist/cli.js package check-source
