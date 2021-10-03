WireGuard configuration
=======================

[![Jekyll](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml/badge.svg)](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml)

Generate WireGuard configuration files.
Hosted on [GitHub Pages] at https://egor-tensin.github.io/wireguard-config/.

[GitHub Pages]: https://pages.github.com

Development
-----------

[Jekyll] is used to build a set of static HTML pages from a collection of
templates and resources.
[Bundler] is used to manage project's dependencies.
Make sure you have the `bundler` gem installed; project dependencies can then
be installed by executing

    bundle install

in the project's root directory.

To run a local web server, run

    bundle exec jekyll serve --drafts

You can then review your changes at http://localhost:4000/wireguard-config/.

Or you can use [jekyll-docker] to set up a development environment in Docker
and not bother with installing everything locally.

[jekyll-theme] is used as a remote Jekyll theme.

[Jekyll]: https://jekyllrb.com/
[Bundler]: http://bundler.io/
[jekyll-docker]: https://github.com/egor-tensin/jekyll-docker
[jekyll-theme]: https://github.com/egor-tensin/jekyll-theme

### Access via file://

Jekyll doesn't provide native support for generating a static website which can
be browsed without running an instance of Jekyll's web server.
One easy workaround is to `wget` the website and convert the links:

    wget --no-verbose --recursive --convert-links --adjust-extension -- http://localhost:4000/blog/

Security
--------

This page only works on the client side - GitHub Pages doesn't allow
server-side processing.
Nothing really prevents me from sending your keys to an external server using
JavaScript, but you can easily verify that it doesn't happen using your
browser's debugging tools.

License
-------

Distributed under the MIT License.
See [LICENSE.txt] for details.

[LICENSE.txt]: LICENSE.txt
