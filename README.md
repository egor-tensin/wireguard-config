WireGuard configuration
=======================

[![Jekyll](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml/badge.svg)](https://github.com/egor-tensin/wireguard-config/actions/workflows/jekyll.yml)

Generate WireGuard configuration files.
Hosted at https://tensin.name/wireguard-config/.

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

[example configuration]: https://tensin.name/wireguard-config/?server_public=iNqGDQ2tltbSN4s3Fpb%2F7PRc2OSwR3%2FbPjOrf8V%2FSmA%3D&server_endpoint=123.123.123.123%3A123&preshared=Moshdr8RNfYUWG%2F0MVOlglzlze3beATD6YumDwCZf5E%3D&client_public=hvfo%2FMgizTRbrktfx3k2Q0Ib0mx0P2N6LRZEYWqkpXc%3D&client_private=qKgmDq8HWaU432qJhEa2Q6pE52P55xBHNOgzB0roP3A%3D&client_ipv4=192.168.123.123%2F24&client_ipv6=fd01%3A2345%3A6789%3A%3A192.168.123.123%2F48

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

This is a static website, so no server-side processing is happening.
You can easily verify that your browser doesn't make any requests to any
servers using your browser's debugging tools.

Development
-----------

This is a static website, built using [Jekyll].
[jekyll-theme] is used as the Jekyll theme.

[Jekyll]: https://jekyllrb.com/
[jekyll-theme]: https://github.com/egor-tensin/jekyll-theme

See [DEVELOPMENT.md] for details.

[DEVELOPMENT.md]: DEVELOPMENT.md

License
-------

Distributed under the MIT License.
See [LICENSE.txt] for details.

[LICENSE.txt]: LICENSE.txt
