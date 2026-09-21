#!/usr/bin/env bash

# Copyright (c) 2026 Egor Tensin <egor@tensin.name>
# This file is part of the "WireGuard configuration" project.
# For details, see https://github.com/egor-tensin/wireguard-config
# Distributed under the MIT License.

set -o errexit -o nounset -o pipefail
shopt -s inherit_errexit lastpipe

script_dir="$( dirname -- "${BASH_SOURCE[0]}" )"
script_dir="$( cd -- "$script_dir" && pwd )"
readonly script_dir

update_gems() {
    echo
    echo ======================================================================
    echo Updating gems
    echo ======================================================================
    bundle config set frozen false
    bundle update
    echo ----------------------------------------------------------------------
}

update_npm_packages() {
    echo
    echo ======================================================================
    echo Updating npm packages
    echo ======================================================================
    npm update
    echo ----------------------------------------------------------------------
}

browserify() {
    echo
    echo ======================================================================
    echo Running Browserify
    echo ======================================================================
    npm exec -- browserify --require ip-address --outfile src/assets/js/bundle.js
    echo ----------------------------------------------------------------------
}

push_changes() {
    echo
    echo ======================================================================
    echo Pushing changes
    echo ======================================================================

    local git_status
    git_status="$( git status --porcelain=v1 )"

    if [ -z "$git_status" ]; then
        echo 'No changes.'
        echo ----------------------------------------------------------------------
        return
    fi

    local allowed=' M Gemfile.lock| M package-lock.json| M src/assets/js/bundle.js'
    
    if echo "$git_status" | grep -E -q --invert-match --line-regexp "($allowed)" ; then
        echo 'Error: unrecognized modifications in the repository:'
        echo "$git_status"
        echo ----------------------------------------------------------------------
        return 1
    fi

    git commit -am 'bump dependencies'
    git push -q
    echo ----------------------------------------------------------------------
}

main() {
    cd -- "$script_dir/.."
    update_gems
    update_npm_packages
    browserify
    push_changes
}

main
