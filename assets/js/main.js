var iface = 'wg0';

function parse_placeholder(val) {
    return true;
}

function parse_positive_integer(src) {
    var val = parseInt(src);
    if (isNaN(val) || val < 1) {
        throw new Error('Cannot parse as a positive integer.');
    }
    return val;
}

function parse_keepalive(src) {
    return parse_positive_integer(src);
}

function parse_endpoint(val) {
    val = val.trim();
    if (val.length == 0) {
        throw new Error('Server endpoint cannot be an empty string.');
    }
    if (!val.match(/^.+:[0-9]+$/)) {
        throw new Error('Please specify a host and a port in the HOST:PORT format.');
    }
    return val;
}

function parse_key(val) {
    val = val.trim();
    if (val.length == 0) {
        throw new Error('Key as used by WireGuard cannot be an empty string.');
    }
    if (!val.match(/^[0-9a-zA-Z+/=]+$/)) {
        throw new Error('Key as used by WireGuard must be Base64-encoded.');
    }
    return val;
}

var IPAddr = function(src, parser) {
    this.src = src;
    this.parser = parser;

    try {
        var val = parser.parseCIDR(src);
    } catch (err) {
        throw new Error('Sorry, IP address validation failed with the following error:\n' + err.message);
    }

    this.addr = val[0];
    this.netmask = val[1];

    this.str = this.addr.toString();

    this.networkID = parser.networkAddressFromCIDR(this.src);
    if (this.addr.kind() == 'ipv4') {
        if (this.str == this.networkID) {
            throw new Error('Please use a real host IP address, not a network identifier.');
        }
        var broadcast = parser.broadcastAddressFromCIDR(this.src);
        if (this.str == broadcast) {
            throw new Error('Please use a real host IP address, not a broadcast address.');
        }
    }
}

IPAddr.prototype.address = function() {
    return this.str + '/' + this.netmask;
}

IPAddr.prototype.allowed_ips_client = function() {
    // As of this writing, _every_ tool accepts something like 192.168.0.1/24
    // here, _except_ for the Android app, which _requires_ the least
    // significant bits to be zeroed out.
    return this.networkID + '/' + this.netmask;
}

IPAddr.prototype.allowed_ips_server = function() {
    if (this.addr.kind() == 'ipv4') {
        var netmask = 32;
    } else if (this.addr.kind() == 'ipv6') {
        var netmask = 128;
    } else {
        throw new Error('What? Not IPv4, and _not_ IPv6?!');
    }
    return this.str + '/' + netmask;
}

function parse_ip(src, parser) {
    src = src.trim();
    if (src.length == 0) {
        throw new Error('IP address cannot be an empty string.');
    }
    return new IPAddr(src, parser);
}

function parse_ipv4(val) {
    return parse_ip(val, ipaddr.IPv4);
}

function parse_ipv6(val) {
    return parse_ip(val, ipaddr.IPv6);
}

var Input = function(name) {
    this.name = name;
}

Input.prototype.input_id = function() {
    return '#param_' + this.name;
}

Input.prototype.error_id = function() {
    return this.input_id() + '_error';
}

Input.prototype.container_id = function() {
    return this.input_id() + '_container';
}

Input.prototype.value = function() {
    return $(this.input_id()).val();
}

Input.prototype.has_value = function() {
    return this.value().length > 0;
}

Input.prototype.set = function(value) {
    $(this.input_id()).val(value);
}

Input.prototype.show = function() {
    $(this.container_id()).show();
}

Input.prototype.hide = function() {
    $(this.container_id()).hide();
}

Input.prototype.show_error = function(msg) {
    this.show();
    $(this.error_id()).text(msg);
    $(this.error_id()).show();
}

Input.prototype.hide_error = function() {
    $(this.error_id()).hide();
}

var Value = function(name, parser) {
    this.name = name;
    this.input = new Input(name);
    this.parser = parser;
    this.optional = false;
    this.advanced = false;

    this.value = null;
    this.error = null;
}

Value.prototype.parse = function() {
    try {
        var value = this.input.value();
        if (!this.optional || value.length > 0) {
            value = this.parser(value);
        }
        this.set_value(value);
        return true;
    } catch (err) {
        this.set_error(err.message);
        return false;
    }
}

Value.prototype.set_value = function(value) {
    this.value = value;
    this.error = null;
    this.input.hide_error();
}

Value.prototype.set_error = function(msg) {
    this.value = null;
    this.error = msg;
    this.input.show_error(this.error);
}

Value.prototype.is_set = function() {
    return this.input.has_value();
}

Value.prototype.set = function(value) {
    this.input.set(value);
}

Value.prototype.show = function() {
    this.input.show();
}

Value.prototype.hide = function() {
    this.input.hide();
}

var Endpoint = function(name) {
    Value.call(this, name, parse_endpoint);
}

Endpoint.prototype = Object.create(Value.prototype);
Endpoint.prototype.constructor = Endpoint;

var Key = function(name) {
    Value.call(this, name, parse_key);
}

Key.prototype = Object.create(Value.prototype);
Key.prototype.constructor = Key;

var IPv4 = function(name) {
    Value.call(this, name, parse_ipv4);
}

IPv4.prototype = Object.create(Value.prototype);
IPv4.prototype.constructor = IPv4;

var IPv6 = function(name) {
    Value.call(this, name, parse_ipv6);
}

IPv6.prototype = Object.create(Value.prototype);
IPv6.prototype.constructor = IPv6;

var Keepalive = function(name) {
    Value.call(this, name, parse_keepalive);
    this.optional = true;
    this.advanced = true;
}

Keepalive.prototype = Object.create(Value.prototype);
Keepalive.prototype.constructor = Keepalive;

var Data = function() {
    this.server_public   = new Key('server_public');
    this.server_endpoint = new Endpoint('server_endpoint');
    this.preshared       = new Key('preshared');
    this.client_public   = new Key('client_public');
    this.client_private  = new Key('client_private');
    this.client_ipv4     = new IPv4('client_ipv4');
    this.client_ipv6     = new IPv6('client_ipv6');
    this.keepalive       = new Keepalive('keepalive');

    this.values = [
        this.server_public,
        this.server_endpoint,
        this.preshared,
        this.client_public,
        this.client_private,
        this.client_ipv4,
        this.client_ipv6,
        this.keepalive
    ];
}

Data.prototype.set_from_url = function(url) {
    var url = new URL(url);
    var params = new URLSearchParams(url.search);
    var has = false;

    this.values.forEach(function(value) {
        if (params.has(value.name)) {
            value.set(params.get(value.name));
            has = true;
        }
    });

    return has;
}

Data.prototype.set_from_this_url = function() {
    return this.set_from_url(window.location.href);
};

Data.prototype.get_perma_url = function() {
    var url = new URL(window.location.href);
    url.search = '';
    var params = new URLSearchParams();
    this.values.forEach(function(value) {
        params.append(value.name, value.input.value());
    });
    url.search = params.toString();
    return url.toString();
}

Data.prototype.parse = function() {
    var success = true;
    this.values.forEach(function(value) {
        if (!value.parse()) {
            success = false;
        }
    });
    if (success) {
        if (!$('#advanced_params').prop('checked'))
            this.hide_advanced();
        this.hide_error();
    } else {
        this.show_error();
    }
    return success;
}

Data.prototype.show_error = function() {
    $('#params_error').text('Please correct the input errors above first.');
    $('#params_error').show();
}

Data.prototype.hide_error = function() {
    $('#params_error').hide();
}

Data.prototype.show_advanced = function() {
    this.values.forEach(function(value) {
        if (!value.advanced)
            return;
        value.show();
    });
}

Data.prototype.hide_advanced = function() {
    this.values.forEach(function(value) {
        if (!value.advanced)
            return;
        value.hide();
    });
}

function format_pre_text(text) {
    return $('<pre/>').text(text);
}

var ConfigFile = function(name, text) {
    this.name = name;
    this.text = text;
}

ConfigFile.prototype.toString = function() {
    return this.text;
}

ConfigFile.prototype.format = function() {
    return format_pre_text(this.toString());
}

var Script = function(text) {
    this.text = text;
}

Script.prototype.toString = function() {
    return this.text;
}

Script.prototype.format = function() {
    return format_pre_text(this.toString());
}

var QRCode = function(text) {
    this.text = text;
}

QRCode.prototype.format = function() {
    var canvas = $('<canvas/>');
    var qr = new QRious({
        element: canvas[0],
        value: this.text,
        size: 350
    });
    return $('<div class="text-center"/>').append(canvas);
}

function wg_quick_client_file(data) {
    var path = `/etc/wireguard/${iface}.conf`;
    var contents =
`# On the client, put this to
#     ${path}
# and either
#     * start the wg-quick@${iface} systemd service,
#     * or run \`wg-quick up ${iface}\`.

[Interface]
PrivateKey = ${data.client_private.value}
Address = ${data.client_ipv4.value.address()}, ${data.client_ipv6.value.address()}

[Peer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.preshared.value}
AllowedIPs = ${data.client_ipv4.value.allowed_ips_client()}, ${data.client_ipv6.value.allowed_ips_client()}
`;

    if (data.keepalive.is_set()) {
        contents +=
`PersistentKeepalive = ${data.keepalive.value}
`;
    }

    return new ConfigFile(path, contents);
}

function wg_quick_server_file(data) {
    var path = `/etc/wireguard/${iface}.conf`;
    return new ConfigFile(path,
`# On the server, add this to
#     ${path}
# and restart the wg-quick@${iface} systemd service.

# Previous contents goes here...

[Peer]
PublicKey = ${data.client_public.value}
PresharedKey = ${data.preshared.value}
AllowedIPs = ${data.client_ipv4.value.allowed_ips_server()}, ${data.client_ipv6.value.allowed_ips_server()}
`);
}

function systemd_client_netdev_file(data) {
    var path = `/etc/systemd/network/${iface}.netdev`;
    var contents =
`# On the client, you need two files. Put this into
#     ${path}
# and after you're done with both files, run
#     systemctl daemon-reload
#     systemctl restart systemd-networkd

[NetDev]
Name = ${iface}
Kind = wireguard

[WireGuard]
PrivateKey = ${data.client_private.value}

[WireGuardPeer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.preshared.value}
AllowedIPs = ${data.client_ipv4.value.allowed_ips_client()}, ${data.client_ipv6.value.allowed_ips_client()}
`;

    if (data.keepalive.is_set()) {
        contents +=
`PersistentKeepalive = ${data.keepalive.value}
`;
    }

    return new ConfigFile(path, contents);
}

function systemd_client_network_file(data) {
    var path = `/etc/systemd/network/${iface}.network`;
    return new ConfigFile(path,
`# This is the second file. Put this into
#     ${path}
# and if you're done with the first file already, run
#     systemctl daemon-reload
#     systemctl restart systemd-networkd

[Match]
Name = ${iface}

[Network]
Address = ${data.client_ipv4.value.address()}
Address = ${data.client_ipv6.value.address()}
`);
}

function systemd_server_netdev_file(data) {
    var path = `/etc/systemd/network/${iface}.netdev`;
    return new ConfigFile(path,
`# On the server, add this to
#     ${path}
# and run
#     systemctl daemon-reload
#     systemctl restart systemd-networkd

# Previous contents goes here...

[WireGuardPeer]
PublicKey = ${data.client_public.value}
PresharedKey = ${data.preshared.value}
AllowedIPs = ${data.client_ipv4.value.allowed_ips_server()}, ${data.client_ipv6.value.allowed_ips_server()}
`);
}

function nmcli_client_file(data) {
    var path = `/etc/NetworkManager/system-connections/${iface}.nmconnection`;
    var contents =
`# On the client, put this to
#     ${path}
# and run
#     chmod 0600 ${path}
#     nmcli c reload
#     nmcli c up ${iface}

[connection]
id=${iface}
type=wireguard
interface-name=${iface}

[wireguard]
private-key=${data.client_private.value}
private-key-flags=0

[wireguard-peer.${data.server_public.value}]
endpoint=${data.server_endpoint.value}
preshared-key=${data.preshared.value}
preshared-key-flags=0
allowed-ips=${data.client_ipv4.value.allowed_ips_client()};${data.client_ipv6.value.allowed_ips_client()};
`;
    if (data.keepalive.is_set()) {
        contents +=
`persistent-keepalive=${data.keepalive.value}
`;
    }

    contents +=
`
[ipv4]
address1=${data.client_ipv4.value.address()}
method=manual

[ipv6]
address1=${data.client_ipv6.value.address()}
method=manual
`;

    return new ConfigFile(path, contents);
}

function nmcli_server_file(data) {
    var path = `/etc/NetworkManager/system-connections/${iface}.nmconnection`;
    return new ConfigFile(path,
`# On the server, add this to
#     ${path}
# and run
#     nmcli c reload
#     nmcli c up ${iface}

# Previous contents goes here...

[wireguard-peer.${data.client_public.value}]
preshared-key=${data.preshared.value}
preshared-key-flags=0
allowed-ips=${data.client_ipv4.value.allowed_ips_server()};${data.client_ipv6.value.allowed_ips_server()};
`);
}

var shell_info =
`# Make sure your .bash_history or whatever is
# secure before running this.
# Better yet, put into a file and run (possibly, using sudo).`;

function manual_client_script(data) {
    return new Script(
`# On the client, run this to set up a connection.
${shell_info}

ip link add dev ${iface} type wireguard
ip addr add ${data.client_ipv4.value.address()} dev ${iface}
ip addr add ${data.client_ipv6.value.address()} dev ${iface}
wg set ${iface} \\
    private-key <( echo ${data.client_private.value} )
wg set ${iface} \\
    peer ${data.server_public.value} \\
    preshared-key <( echo ${data.preshared.value} ) \\
    endpoint ${data.server_endpoint.value} \\
    allowed-ips ${data.client_ipv4.value.allowed_ips_client()},${data.client_ipv6.value.allowed_ips_client()}
ip link set ${iface} up
`);
}

function manual_server_script(data) {
    return new Script(
`# On the server, run this to tweak an existing connection.
${shell_info}

wg set ${iface} \\
    peer ${data.client_public.value} \\
    preshared-key <( echo ${data.preshared.value} ) \\
    allowed-ips ${data.client_ipv4.value.allowed_ips_server()},${data.client_ipv6.value.allowed_ips_server()}
`);
}

var Guide = function(name) {
    this.name = name;
}

Guide.prototype.format = function(data) {
    var container = $('<div/>');
    container.append($('<h2/>').html(this.name));
    return container;
}

var GuidePermaURL = function() {
    Guide.call(this, 'Permanent URL');
}

GuidePermaURL.prototype = Object.create(Guide.prototype);
GuidePermaURL.prototype.constructor = GuidePermaURL;

GuidePermaURL.prototype.format = function(data) {
    var container = Guide.prototype.format.call(this, data);
    container
        .append($('<p/>').text('Use the following URL to share this configuration. Be careful: it probably contains sensitive data, like your private keys.'))
        .append($('<pre/>').append($('<a/>', {href: data.get_perma_url()}).text(data.get_perma_url())));
    return container;
}

var GuideServerClient = function(name) {
    Guide.call(this, name);
}

GuideServerClient.prototype = Object.create(Guide.prototype);
GuideServerClient.prototype.constructor = GuideServerClient;

GuideServerClient.prototype.for_server = function(data) { return []; }
GuideServerClient.prototype.for_client = function(data) { return []; }

GuideServerClient.prototype.join_guides = function(guides) {
    var container = $('<div/>');
    guides.forEach(function(guide) {
        container.append(guide.format());
    });
    return container;
}

GuideServerClient.prototype.format = function(data) {
    var container = Guide.prototype.format.call(this, data);
    container
        .append($('<div class="row"/>')
            .append($('<div class="col-md-6"/>')
                .append(this.join_guides(this.for_server(data))))
            .append($('<div class="col-md-6"/>')
                .append(this.join_guides(this.for_client(data)))));
    return container;
}

var GuideWgQuick = function() {
    GuideServerClient.call(this, 'wg-quick');
}

GuideWgQuick.prototype = Object.create(GuideServerClient.prototype);
GuideWgQuick.prototype.constructor = GuideWgQuick;

GuideWgQuick.prototype.for_client = function(data) {
    var config = wg_quick_client_file(data);
    var qr = new QRCode(config.text);
    return [config, qr];
}

GuideWgQuick.prototype.for_server = function(data) {
    return [wg_quick_server_file(data)];
}

var GuideSystemd = function() {
    GuideServerClient.call(this, 'systemd-networkd');
}

GuideSystemd.prototype = Object.create(GuideServerClient.prototype);
GuideSystemd.prototype.constructor = GuideSystemd;

GuideSystemd.prototype.for_client = function(data) {
    return [systemd_client_netdev_file(data), systemd_client_network_file(data)];
}

GuideSystemd.prototype.for_server = function(data) {
    return [systemd_server_netdev_file(data)];
}

var GuideNetworkManager = function() {
    GuideServerClient.call(this, 'NetworkManager');
}

GuideNetworkManager.prototype = Object.create(GuideServerClient.prototype);
GuideNetworkManager.prototype.constructor = GuideNetworkManager;

GuideNetworkManager.prototype.for_client = function(data) {
    return [nmcli_client_file(data)];
}

GuideNetworkManager.prototype.for_server = function(data) {
    return [nmcli_server_file(data)];
}

var GuideManual = function() {
    GuideServerClient.call(this, '<code>ip</code> &amp; <code>wg</code>');
}

GuideManual.prototype = Object.create(GuideServerClient.prototype);
GuideManual.prototype.constructor = GuideManual;

GuideManual.prototype.for_client = function(data) {
    return [manual_client_script(data)];
}

GuideManual.prototype.for_server = function(data) {
    return [manual_server_script(data)];
}

function clear_guides() {
    $('#guides').empty();
}

function add_guide(guide, data) {
    $('#guides').append(guide.format(data));
}

function guides_from_data(data) {
    if (!data.parse()) {
        return;
    }

    var guides = [
        new GuidePermaURL(),
        new GuideWgQuick(),
        new GuideSystemd(),
        new GuideNetworkManager(),
        new GuideManual()
    ];

    guides.forEach(function(guide) {
        add_guide(guide, data);
    });
}

function form_on_submit() {
    clear_guides();

    var data = new Data();
    guides_from_data(data);

    return false;
}

function advanced_params_on_click(input) {
    var data = new Data();
    if (input.checked) {
        data.show_advanced();
    } else {
        data.hide_advanced();
    }
}

function main() {
    var data = new Data();
    if (data.set_from_this_url()) {
        guides_from_data(data);
    }
}

$(function() {
    main();
});
