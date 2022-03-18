var iface = 'wg0';

function parse_placeholder(val) {
    return val;
}

function parse_boolean(val) {
    if (val === 'true')
        return true;
    if (val === 'false')
        return false;
    throw new Error('Cannot parse as a boolean.');
}

function parse_boolean_or_string(val) {
    if (typeof val == 'boolean') {
        return val;
    }
    return parse_boolean(val);
}

function try_parse_boolean_or_string(val) {
    try {
        return parse_boolean_or_string(val);
    } catch (err) {
        return null;
    }
}

function parse_positive_integer(src) {
    var val = parseInt(src);
    if (isNaN(val) || val < 1)
        throw new Error('Cannot parse as a positive integer.');
    return val;
}

function parse_keepalive(src) {
    return parse_positive_integer(src);
}

function parse_tunnel_everything(src) {
    return parse_boolean_or_string(src);
}

function parse_endpoint(val) {
    val = val.trim();
    if (val.length == 0)
        throw new Error('Server endpoint cannot be an empty string.');
    if (!val.match(/^.+:[0-9]+$/))
        throw new Error('Please specify a host and a port in the HOST:PORT format.');
    return val;
}

function parse_key(val) {
    val = val.trim();
    if (val.length == 0)
        throw new Error('Key as used by WireGuard cannot be an empty string.');
    if (!val.match(/^[0-9a-zA-Z+/=]+$/))
        throw new Error('Key as used by WireGuard must be Base64-encoded.');
    return val;
}

var ip_address_lib = require('ip-address');

function parse_ip_internal(src, parser) {
    src = src.trim();
    if (src.length == 0)
        throw new Error('IP address cannot be an empty string.');

    try {
        var result = new parser(src);
    } catch (err) {
        throw new Error('Sorry, IP address validation failed with the following error:\n' + err.message);
    }
    return result;
}

function parse_ip(src, parser) {
    var result = parse_ip_internal(src, parser);

    if (result.parsedSubnet)
        throw new Error('Please specify address without the netmask.')

    return result.correctForm();
}

function parse_ip_cidr(src, parser) {
    var result = parse_ip_internal(src, parser);

    if (!result.parsedSubnet)
        throw new Error('Please specify address using the CIDR format (including the netmask).');

    var addr = result.correctForm();
    var netmask = result.subnetMask;
    var network_id = result.startAddress().correctForm();

    return [addr, netmask, network_id];
}

function parse_ipv4(src) {
    var result = parse_ip(src, ip_address_lib.Address4);
    return result;
}

function parse_ipv4_cidr(src) {
    var parser = ip_address_lib.Address4;
    var result = parse_ip_cidr(src, ip_address_lib.Address4);

    var addr = result[0];
    var netmask = result[1];
    var network_id = result[2];
    var broadcast_addr = new parser(src).endAddress().correctForm();

    if (addr == network_id && netmask != 32)
        throw new Error('Please use a real host IP address, not a network identifier.');
    if (addr == broadcast_addr && netmask != 32)
        throw new Error('Please use a real host IP address, not a broadcast address.');

    return result;
}

function parse_ipv6(val) {
    return parse_ip(val, ip_address_lib.Address6);
}

function parse_ipv6_cidr(val) {
    return parse_ip_cidr(val, ip_address_lib.Address6);
}

function parse_ip_list(val, addr_parser) {
    var parts = val.split(/, */);
    var result = [];
    parts.forEach(function(part) {
        result.push(addr_parser(part));
    });
    return result;
}

var Input = function(name) {
    this.name = name;

    if (this.is_checkbox()) {
        // Keep the checked property and the value consistent.
        $(this.input_id()).change(function(evt) {
            var elem = evt.target;
            elem.value = elem.checked;
        });
    }
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

Input.prototype.is_checkbox = function() {
    return $(this.input_id()).attr('type') == 'checkbox';
}

Input.prototype.value = function() {
    return $(this.input_id()).val();
}

Input.prototype.has_value = function() {
    return this.value().length > 0;
}

Input.prototype.set = function(value) {
    if (this.is_checkbox() && try_parse_boolean_or_string(value))
        $(this.input_id()).prop('checked', true);
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
    return this.parse_from(this.input.value());
}

Value.prototype.parse_from = function(src) {
    try {
        var value = src;
        switch (typeof value) {
            case 'boolean':
                value = this.parser(value);
                break;
            default:
                if (this.optional && value.length == 0)
                    break;
                value = this.parser(value);
                break;
        }
        this.input.set(src);
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

var IPAddr = function(name, parser) {
    Value.call(this, name, parser);
}

IPAddr.prototype = Object.create(Value.prototype);
IPAddr.prototype.constructor = IPAddr;

IPAddr.prototype.set_value = function(value) {
    Value.prototype.set_value.call(this, value);

    this.addr = this.value[0];
    this.netmask = this.value[1];
    this.network_id = this.value[2];
}

IPAddr.prototype.full_address = function() {
    return this.addr + '/' + this.netmask;
}

IPAddr.prototype.allowed_ips_client = function() {
    // As of this writing, _every_ tool accepts something like 192.168.0.1/24
    // here, _except_ for the Android app, which _requires_ the least
    // significant bits to be zeroed out.
    return this.network_id + '/' + this.netmask;
}

var IPv4 = function(name) {
    IPAddr.call(this, name, parse_ipv4_cidr);
}

IPv4.prototype = Object.create(IPAddr.prototype);
IPv4.prototype.constructor = IPv4;

IPv4.prototype.allowed_ips_server = function() {
    return this.addr + '/' + 32;
}

var IPv6 = function(name) {
    IPAddr.call(this, name, parse_ipv6_cidr);
}

IPv6.prototype = Object.create(IPAddr.prototype);
IPv6.prototype.constructor = IPv6;

IPv6.prototype.allowed_ips_server = function() {
    return this.addr + '/' + 128;
}

var Keepalive = function(name) {
    Value.call(this, name, parse_keepalive);
    this.optional = true;
    this.advanced = true;
}

Keepalive.prototype = Object.create(Value.prototype);
Keepalive.prototype.constructor = Keepalive;

var TunnelEverything = function(name) {
    Value.call(this, name, parse_tunnel_everything);
    this.optional = true;
    this.advanced = true;
}

TunnelEverything.prototype = Object.create(Value.prototype);
TunnelEverything.prototype.constructor = TunnelEverything;

var IPAddrList = function(name, parser) {
    Value.call(this, name, function(val) {
        return parse_ip_list(val, parser);
    });
}

IPAddrList.prototype = Object.create(Value.prototype);
IPAddrList.prototype.constructor = IPAddrList;

var DNS_IPv4 = function(name) {
    IPAddrList.call(this, name, parse_ipv4);
    this.optional = true;
    this.advanced = true;
}

DNS_IPv4.prototype = Object.create(IPAddrList.prototype);
DNS_IPv4.prototype.constructor = DNS_IPv4;

var DNS_IPv6 = function(name) {
    IPAddrList.call(this, name, parse_ipv6);
    this.optional = true;
    this.advanced = true;
}

DNS_IPv6.prototype = Object.create(IPAddrList.prototype);
DNS_IPv6.prototype.constructor = DNS_IPv6;

var Data = function() {
    this.server_public   = new Key('server_public');
    this.server_endpoint = new Endpoint('server_endpoint');
    this.preshared       = new Key('preshared');
    this.client_public   = new Key('client_public');
    this.client_private  = new Key('client_private');
    this.client_ipv4     = new IPv4('client_ipv4');
    this.client_ipv6     = new IPv6('client_ipv6');
    this.keepalive       = new Keepalive('keepalive');
    this.tunnel_everything = new TunnelEverything('tunnel_everything');
    this.dns_ipv4        = new DNS_IPv4('dns_ipv4');
    this.dns_ipv6        = new DNS_IPv6('dns_ipv6');

    this.values = [
        this.server_public,
        this.server_endpoint,
        this.preshared,
        this.client_public,
        this.client_private,
        this.client_ipv4,
        this.client_ipv6,
        this.keepalive,
        this.tunnel_everything,
        this.dns_ipv4,
        this.dns_ipv6
    ];
}

Data.prototype.set_from_url = function(url) {
    var url = new URL(url);
    var params = new URLSearchParams(url.search);
    var has = false;

    this.values.forEach(function(value) {
        if (params.has(value.name)) {
            has = true;
            value.input.set(params.get(value.name));
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
        if (!value.parse())
            success = false;
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

function edit_btn_init(btn) {
    btn.empty();
    btn.append('<span class="glyphicon glyphicon-pencil"/>');
}

function edit_btn_save(btn) {
    btn.empty();
    btn.append('<span class="glyphicon glyphicon-floppy-disk"/>');
}

function edit_btn_on_click(btn, pre) {
    var editable = pre.prop('isContentEditable');
    pre.prop('contentEditable', !editable);
    if (editable) {
        edit_btn_init(btn);
        btn.blur(); // a.k.a. unfocus
    } else {
        edit_btn_save(btn);
        pre.focus();
    }
}

function dload_btn_init(btn) {
    btn.empty();
    btn.append('<span class="glyphicon glyphicon-download-alt"/>');
}

function basename(path) {
    return path.substring(path.lastIndexOf('/') + 1);
}

function dload_btn_on_click(btn, path, pre) {
    // The type must be application/octet-stream; if it's text/plain, the
    // Android Chrome appends the .txt suffix to the downloaded file names.
    var blob = new Blob([pre.text()], {type: 'application/octet-stream'});
    var url = URL.createObjectURL(blob);

    var link = $('<a/>');
    link.prop('href', url);
    link.prop('download', basename(path));

    // Whoever thought of this [0] is fucking crazy:
    // https://stackoverflow.com/a/36483380/514684
    // It literally silently does nothing if this is omitted.
    link[0].click();
}

function copy_to_clipboard(elem) {
    // This is rather neat, thanks:
    // https://stackoverflow.com/a/22581382/514684

    // Apparently, you can only do execCommand('copy') from <input> and
    // <textarea> elements. Another stupidity, I'm so surprised.
    var is_input = elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA';
    var orig_select_start, orig_select_end;

    if (is_input) {
        var target = elem;
        orig_select_start = elem.selectionStart;
        orig_select_end = elem.selectionEnd;
    } else {
        var target = document.createElement('textarea');
        target.textContent = elem.textContent;
        document.body.appendChild(target);
    }

    var current_focus = document.activeElement;
    target.focus();
    target.setSelectionRange(0, target.value.length);

    var succeed;
    try {
        // Supposedly, this is deprecated. But the "proper" method sucks balls,
        // so I'm using this one:
        // https://stackoverflow.com/a/30810322/514684
        succeed = document.execCommand('copy');
    } catch (e) {
        succeed = false;
    }

    if (current_focus && typeof current_focus.focus === "function") {
        current_focus.focus();
    }

    if (is_input) {
        elem.setSelectionRange(orig_select_start, orig_select_end);
    } else {
        document.body.removeChild(target);
    }
    return succeed;
}

function copy_btn_init(btn) {
    btn.empty();
    btn.append('<span class="glyphicon glyphicon-copy"/>');
}

function copy_btn_on_click(btn, pre) {
    copy_to_clipboard(pre[0]);
}

function make_pre_buttons(path, pre) {
    var edit_btn = $('<button class="btn btn-default" type="button" title="Edit"/>');
    edit_btn_init(edit_btn);
    edit_btn.click(function() {
        edit_btn_on_click(edit_btn, pre);
    });

    var dload_btn = $('<button class="btn btn-default" type="button" title="Download"/>');
    dload_btn_init(dload_btn);
    dload_btn.click(function() {
        dload_btn_on_click(dload_btn, path, pre);
    });

    var copy_btn = $('<button class="btn btn-default" type="button" title="Copy"/>');
    copy_btn_init(copy_btn);
    copy_btn.click(function() {
        copy_btn_on_click(copy_btn, pre);
    });

    return $('<div class="pre_buttons btn-group btn-group-xs" role="group"/>')
        .append(copy_btn)
        .append(dload_btn)
        .append(edit_btn);
}

function format_pre_text(pre, name) {
    return $('<div class="pre_container"/>')
        .append(pre)
        .append(make_pre_buttons(name, pre));
}

var ConfigFile = function(name, text) {
    this.name = name;
    this.text = text;
    this.pre = $('<pre/>').text(text);
}

ConfigFile.prototype.format = function() {
    return format_pre_text(this.pre, this.name);
}

var QRCode = function(pre) {
    this.pre = pre;
}

function draw_qr_code(container, text) {
    var canvas = $('<canvas/>');
    var qr = new QRious({
        element: canvas[0],
        value: text,
        size: 350
    });
    container.append(canvas);
}

QRCode.prototype.format = function() {
    var container = $('<div class="text-center"/>');
    var pre = this.pre;
    pre.on('blur', function() {
        container.empty();
        draw_qr_code(container, pre.text());
    });
    draw_qr_code(container, pre.text());
    return container;
}

var catchall_ipv4 = '0.0.0.0/0';
var catchall_ipv6 = '::/0';

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
Address = ${data.client_ipv4.full_address()}, ${data.client_ipv6.full_address()}
`;

    if (data.tunnel_everything.value) {
        contents +=
`DNS = ${(data.dns_ipv4.value.concat(data.dns_ipv6.value)).join(',')}
`;
    }

    contents +=
`
[Peer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.preshared.value}
`;

    if (data.tunnel_everything.value) {
        contents +=
`AllowedIPs = ${catchall_ipv4}, ${catchall_ipv6}
`;
    } else {
        contents +=
`AllowedIPs = ${data.client_ipv4.allowed_ips_client()}, ${data.client_ipv6.allowed_ips_client()}
`;
    }

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
AllowedIPs = ${data.client_ipv4.allowed_ips_server()}, ${data.client_ipv6.allowed_ips_server()}
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
`;

    if (data.tunnel_everything.value) {
        contents +=
`FirewallMark = 0x8888
`;
    }

    contents +=
`
[WireGuardPeer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.preshared.value}
`;

    if (data.tunnel_everything.value) {
        contents +=
`AllowedIPs = ${catchall_ipv4}, ${catchall_ipv6}
`;
    } else {
        contents +=
`AllowedIPs = ${data.client_ipv4.allowed_ips_client()}, ${data.client_ipv6.allowed_ips_client()}
`;
    }

    if (data.keepalive.is_set()) {
        contents +=
`PersistentKeepalive = ${data.keepalive.value}
`;
    }

    return new ConfigFile(path, contents);
}

function systemd_client_network_file(data) {
    var path = `/etc/systemd/network/${iface}.network`;
    var contents =
`# This is the second file. Put this into
#     ${path}
# and if you're done with the first file already, run
#     systemctl daemon-reload
#     systemctl restart systemd-networkd

[Match]
Name = ${iface}

[Network]
Address = ${data.client_ipv4.full_address()}
Address = ${data.client_ipv6.full_address()}
`;

    if (data.tunnel_everything.value) {
        data.dns_ipv4.value.forEach(function(val) {
            contents +=
`DNS = ${val}
`;
        });
        data.dns_ipv6.value.forEach(function(val) {
            contents +=
`DNS = ${val}
`;
        });
        contents +=
`Domains = ~.
DNSDefaultRoute = true

[RoutingPolicyRule]
FirewallMark = 0x8888
InvertRule = true
Table = 1000
Priority = 10
`;
    }

    // I know this doesn't work, but I don't care, systemd-networkd is a
    // fucking nightmare.
    return new ConfigFile(path, contents);
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
AllowedIPs = ${data.client_ipv4.allowed_ips_server()}, ${data.client_ipv6.allowed_ips_server()}
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
`;
    if (data.tunnel_everything.value) {
        contents +=
`allowed-ips=${catchall_ipv4};${catchall_ipv6};
`;
    } else {
        contents +=
`allowed-ips=${data.client_ipv4.allowed_ips_client()};${data.client_ipv6.allowed_ips_client()};
`;
    }
    if (data.keepalive.is_set()) {
        contents +=
`persistent-keepalive=${data.keepalive.value}
`;
    }

    contents +=
`
[ipv4]
address1=${data.client_ipv4.full_address()}
method=manual
`;

    if (data.tunnel_everything.value) {
        contents +=
`dns=${data.dns_ipv4.value.join(';')};
dns-priority=-10
dns-search=~;
`;
    }

    contents +=
`
[ipv6]
address1=${data.client_ipv6.full_address()}
method=manual
`;

    if (data.tunnel_everything.value) {
        contents +=
`dns=${data.dns_ipv6.value.join(';')};
dns-priority=-10
dns-search=~;
`;
    }

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
allowed-ips=${data.client_ipv4.allowed_ips_server()};${data.client_ipv6.allowed_ips_server()};
`);
}

var shell_info =
`# Make sure your .bash_history or whatever is
# secure before running this.
# Better yet, put into a file and run (possibly, using sudo).`;

function manual_client_script(data) {
    var contents =
`# On the client, run this to set up a connection.
${shell_info}

ip link add dev ${iface} type wireguard
ip addr add ${data.client_ipv4.full_address()} dev ${iface}
ip addr add ${data.client_ipv6.full_address()} dev ${iface}
wg set ${iface} \\
    private-key <( echo ${data.client_private.value} )
wg set ${iface} \\
    peer ${data.server_public.value} \\
    preshared-key <( echo ${data.preshared.value} ) \\
    endpoint ${data.server_endpoint.value} \\
`;
    if (data.tunnel_everything.value) {
        contents +=
`    allowed-ips ${catchall_ipv4},${catchall_ipv6}
`;
    } else {
        contents +=
`    allowed-ips ${data.client_ipv4.allowed_ips_client()},${data.client_ipv6.allowed_ips_client()}
`;
    }

    contents +=
`ip link set ${iface} up
`;
    return new ConfigFile('client_setup.sh', contents);
}

function manual_server_script(data) {
    return new ConfigFile('server_setup.sh',
`# On the server, run this to tweak an existing connection.
${shell_info}

wg set ${iface} \\
    peer ${data.client_public.value} \\
    preshared-key <( echo ${data.preshared.value} ) \\
    allowed-ips ${data.client_ipv4.allowed_ips_server()},${data.client_ipv6.allowed_ips_server()}
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
    var qr = new QRCode(config.pre);
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
    if (input.checked)
        data.show_advanced();
    else
        data.hide_advanced();
}

function main() {
    var data = new Data();
    if (data.set_from_this_url())
        guides_from_data(data);
}

$(function() {
    main();
});
