Workspace setup
---------------

* To reduce pain, set up [rbenv] to manage your Ruby versions.
Install one that's known to work: `make ruby`
    * Otherwise, make sure you have Ruby and [Bundler] set up.
* Install dependencies: `make deps`
* Make sure builds are working: `make build`

[rbenv]: https://github.com/rbenv/rbenv
[Bundler]: https://bundler.io/

Development
-----------

* Build the example website and serve it at http://localhost:4000/wireguard-config/:
`make serve`
    * It will pick up changes and reload pages automatically.

Upgrading dependencies
----------------------

Ruby dependencies:

    bundle update

Node.js dependencies:

    make npm
    npm update
    make bundle

Building static pages
---------------------

If you try to copy the _site directory and open index.html without running the
web server, it won't work: all links will be messed up.
Jekyll doesn't provide native support for generating a static website which can
be browsed without running a web server.

One workaround is to `wget` the website:

    make serve LIVE_RELOAD=0    # Live reloading breaks wget
    make wget

The truly static version will be downloaded to the .wget/ directory.

Node.js dependencies
--------------------

For IP address parsing and validation, [ipaddr.js] was used originally.
It is pre-built for browser use, which is nice; however, it's [buggy].
It was replaced by [ip-address], which is not browser-ready; instead,
[Browserify] is used to turn it into a suitable .js file.

This whole situation sucks, but I really want to keep this website static.
TODO: find other options or wait until ipaddr.js fixes the bug.

[ipaddr.js]: https://github.com/whitequark/ipaddr.js
[buggy]: https://github.com/whitequark/ipaddr.js/issues/160
[ip-address]: https://github.com/beaugunderson/ip-address
[Browserify]: https://browserify.org/
