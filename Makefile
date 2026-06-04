VERSION := $(shell grep '"version"' manifest.v3.json | head -n 1 | awk -F'"' '{print $$4}')
DIST_DIR := dist/$(VERSION)
FILES := manifest.json background.js options.html options.js icons README.md LICENSE EULA.md PRIVACY_POLICY.md

.PHONY: chrome firefox manifest-2 mv2 v2 manifest-3 mv3 v3 build clean publish

manifest-3 mv3 v3 chrome:
	cp manifest.v3.json manifest.json
	@echo "🧹 CacheFlux: Switched active configuration to Manifest V3 (Chrome)"

manifest-2 mv2 v2 firefox:
	cp manifest.v2.json manifest.json
	@echo "🧹 CacheFlux: Switched active configuration to Manifest V2 (Firefox)"

publish:
	@if git show-ref --tags "refs/tags/v$(VERSION)" >/dev/null 2>&1; then \
		echo "❌ Error: Tag v$(VERSION) already exists!"; \
		echo "Please bump the \"version\" in manifest.v3.json and manifest.v2.json before publishing."; \
		exit 1; \
	fi
	@echo "🧹 CacheFlux: Tagging and publishing version v$(VERSION)..."
	git tag v$(VERSION)
	git push origin v$(VERSION)
	@echo "✅ Publish triggered! GitHub Actions will now build and release to stores."
	@echo "📝 In a few moments, you can/should edit the Release Notes here:"
	@echo "👉 https://github.com/albertolicea00/cache-flux-addon/releases/edit/v$(VERSION)"

build:
	@echo "🧹 CacheFlux: Building version $(VERSION) in $(DIST_DIR)..."
	@mkdir -p $(DIST_DIR)
	@$(MAKE) chrome
	zip -r $(DIST_DIR)/cache-flux-manifest-v3.zip $(FILES)
	@$(MAKE) firefox
	zip -r $(DIST_DIR)/cache-flux-manifest-v2.zip $(FILES)
	@echo "✅ Build complete! Packages generated in $(DIST_DIR)/"

clean:
	@echo "🧹 CacheFlux: Cleaning up..."
	rm -rf dist/
	rm -f manifest.json
