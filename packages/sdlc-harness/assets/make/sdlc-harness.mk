.PHONY: sdlc-harness-status sdlc-harness-sync sdlc-harness-doctor

sdlc-harness-status:
	npx sdlc-harness doctor

sdlc-harness-sync:
	npx sdlc-harness sync

sdlc-harness-doctor:
	npx sdlc-harness doctor
