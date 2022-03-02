WireGuard configuration
=======================

[![Jekyll](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml/badge.svg)](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml)

Generate WireGuard configuration files.
Hosted on [GitHub Pages] at https://egor-tensin.github.io/wireguard-config/.

[GitHub Pages]: https://pages.github.com

Easily generate WireGuard client & server configuration for the following
connection managers:

* [wg-quick],
* [systemd-networkd],
* [NetworkManager],
* `ip` and [wg].

[wg-quick]: https://man7.org/linux/man-pages/man8/wg-quick.8.html
[systemd-networkd]: https://www.freedesktop.org/software/systemd/man/systemd.network.html
[NetworkManager]: https://wiki.gnome.org/Projects/NetworkManager
[wg]: https://man7.org/linux/man-pages/man8/wg.8.html

An example configuration (with bogus key values) can be seen [here].

[here]: https://egor-tensin.github.io/wireguard-config/?server_public=a&server_endpoint=b:123&preshared=c&client_public=d&client_private=e&client_ipv4=192.168.1.1/24&client_ipv6=fd::/48

Description
-----------

WireGuard is incredibly flexible.
For one thing, there's no built-in notion of a "server" and its "clients".
However, I believe that there being a central server and a number of clients
connected to it is a common use-case.
Adding a client might not be easy, since their configuration is typically
distributed in a file adhering to a WireGuard-specific format; these files can
be tedious to write by hand.
This project tries to make this task easier.

Security
--------

This page only works on the client side - GitHub Pages doesn't allow
server-side processing.
Nothing really prevents me from sending your keys to an external server using
JavaScript, but you can easily verify that it doesn't happen using your
browser's debugging tools.

Development
-----------

This is a "static" website, generated using [Jekyll].

Make sure you have Ruby and [Bundler] set up.
[GNU Make] is used for shortcuts.

* Install dependencies by running `make deps`.
* Build the website by running `make build`.
* Launch a local web server by running `make serve`.
You can then access the website at http://localhost:4000/wireguard-config/.

[jekyll-theme] is used as a remote Jekyll theme.

[Jekyll]: https://jekyllrb.com/
[Bundler]: https://bundler.io/
[GNU Make]: https://www.gnu.org/software/make/
[jekyll-theme]: https://github.com/egor-tensin/jekyll-theme

### Access via file://

Jekyll doesn't provide native support for generating a static website which can
be browsed without running a web server.
One easy workaround is to `wget` the website and convert the links using
`make wget`.

License
-------

Distributed under the MIT License.
See [LICENSE.txt] for details.

[LICENSE.txt]: LICENSE.txt
