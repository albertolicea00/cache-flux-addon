.PHONY: chrome firefox manifest-2 mv2 v2 manifest-3 mv3 v3

manifest-3 mv3 v3 chrome:
	cp manifest.v3.json manifest.json
	@echo "🧹 CacheFlux: Switched active configuration to Manifest V3 (Chrome)"

manifest-2 mv2 v2 firefox:
	cp manifest.v2.json manifest.json
	@echo "🧹 CacheFlux: Switched active configuration to Manifest V2 (Firefox)"
