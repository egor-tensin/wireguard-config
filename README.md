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

Take a look at an [example configuration] to learn more.

[example configuration]: https://egor-tensin.github.io/wireguard-config/?server_public=iNqGDQ2tltbSN4s3Fpb%2F7PRc2OSwR3%2FbPjOrf8V%2FSmA%3D&server_endpoint=123.123.123.123%3A123&preshared=Moshdr8RNfYUWG%2F0MVOlglzlze3beATD6YumDwCZf5E%3D&client_public=hvfo%2FMgizTRbrktfx3k2Q0Ib0mx0P2N6LRZEYWqkpXc%3D&client_private=qKgmDq8HWaU432qJhEa2Q6pE52P55xBHNOgzB0roP3A%3D&client_ipv4=192.168.123.123%2F24&client_ipv6=fd01%3A2345%3A6789%3A%3A192.168.123.123%2F48

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
Access the website at http://localhost:4000/wireguard-config/.

[jekyll-theme] is used as a remote Jekyll theme.

[Jekyll]: https://jekyllrb.com/
[Bundler]: https://bundler.io/
[GNU Make]: https://www.gnu.org/software/make/
[jekyll-theme]: https://github.com/egor-tensin/jekyll-theme

### Access via file://

Jekyll doesn't provide native support for generating a static website which can
be browsed without running a web server.
One workaround is to `wget` the website (use `make wget`).
The truly static version will be downloaded to the .wget/ directory.

### Node.js dependencies

For IP address parsing and validation, [ipaddr.js] was used originally.
It is pre-built for browser use, which is nice; however, it's [buggy].
It was replaced by [ip-address], which is not browser-ready; instead,
[Browserify] is used to turn it into a suitable .js file
(`make npm && make bundle`).

This whole situation sucks, but I really want to keep this website static.
TODO: find other options or wait until ipaddr.js fixes the bug.

[ipaddr.js]: https://github.com/whitequark/ipaddr.js
[buggy]: https://github.com/whitequark/ipaddr.js/issues/160
[ip-address]: https://github.com/beaugunderson/ip-address
[Browserify]: https://browserify.org/

License
-------

Distributed under the MIT License.
See [LICENSE.txt] for details.

[LICENSE.txt]: LICENSE.txt
