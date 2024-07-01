include prelude.mk

LIVE_RELOAD ?= 1
$(eval $(call noexpand,LIVE_RELOAD))

.PHONY: all
all: serve

.PHONY: ruby
ruby:
	if command -v rbenv &> /dev/null; then rbenv install --skip-existing; fi

.PHONY: deps
deps: ruby
	bundle install
	npm install

.PHONY: browserify
browserify: assets/js/bundle.js

assets/js/bundle.js: package-lock.json
	npm exec -- browserify --require ip-address --outfile '$(call escape,$@)'

.PHONY: maintenance
maintenance: ruby
	bundle update
	npm update
	@$(MAKE) browserify

	@git_status="$$( git status --porcelain=v1 )" && \
	if [ -z "$$git_status" ]; then \
		true ; \
	elif [ "$$git_status" = $$' M Gemfile.lock\n M package-lock.json' ] \
			|| [ "$$git_status" = $$' M Gemfile.lock\n M package-lock.json\n M assets/js/bundle.js' ]; then \
		git commit -am 'bump dependencies' && \
			git push -q ; \
	else \
		echo ; \
		echo '-----------------------------------------------------------------'; \
		echo 'Error: unrecognized modifications in the repository'; \
		echo '-----------------------------------------------------------------'; \
		exit 1; \
	fi

jekyll := bundle exec jekyll

.PHONY: build
build:
	$(jekyll) build

.PHONY: serve
serve:
ifeq ($(LIVE_RELOAD),1)
	$(jekyll) serve --livereload
else
	$(jekyll) serve
endif

URL := http://localhost:4000/wireguard-config/

.PHONY: wget
wget:
	wget --no-verbose --recursive --no-parent --convert-links --adjust-extension -e robots=off --directory-prefix=.wget -- '$(call escape,$(URL))'

.PHONY: view
view:
	xdg-open '$(call escape,$(URL))' &> /dev/null

REMOTE_USER ?= who
REMOTE_HOST ?= where
REMOTE_PORT ?= 22
REMOTE_DIR  ?= /path/to/dir

$(eval $(call noexpand,REMOTE_USER))
$(eval $(call noexpand,REMOTE_HOST))
$(eval $(call noexpand,REMOTE_PORT))
$(eval $(call noexpand,REMOTE_DIR))

.PHONY: deploy
deploy:
	rsync -avh -e 'ssh -p $(call escape,$(REMOTE_PORT)) -o StrictHostKeyChecking=no' _site/ '$(call escape,$(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)/)' --delete
