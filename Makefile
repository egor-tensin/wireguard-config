MAKEFLAGS += --no-builtin-rules --no-builtin-variables --warn-undefined-variables
unexport MAKEFLAGS
.DEFAULT_GOAL := all
.DELETE_ON_ERROR:
.SUFFIXES:
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

escape = $(subst ','\'',$(1))

define noexpand
ifeq ($$(origin $(1)),environment)
    $(1) := $$(value $(1))
endif
ifeq ($$(origin $(1)),environment override)
    $(1) := $$(value $(1))
endif
ifeq ($$(origin $(1)),command line)
    override $(1) := $$(value $(1))
endif
endef

.PHONY: all
all: serve

.PHONY: ruby
ruby:
	if command -v rbenv &> /dev/null; then rbenv install --skip-existing; fi

.PHONY: deps
deps: ruby
	bundle install

.PHONY: npm
npm:
	npm install

.PHONY: all-deps
all-deps: deps npm

jekyll := bundle exec jekyll

.PHONY: build
build:
	$(jekyll) build

.PHONY: serve
serve:
	$(jekyll) serve

URL := http://localhost:4000/wireguard-config/

.PHONY: wget
wget:
	wget --no-verbose --recursive --no-parent --convert-links --adjust-extension -e robots=off --directory-prefix=.wget -- '$(call escape,$(URL))'

.PHONY: view
view:
	xdg-open '$(call escape,$(URL))' &> /dev/null

.PHONY: bundle
bundle: assets/js/bundle.js

assets/js/bundle.js: package-lock.json
	npm exec -- browserify --require ip-address --outfile '$(call escape,$@)'
