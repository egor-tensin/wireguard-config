var iface = 'wg0';
var persistent_keepalive = 25;

function parse_placeholder(val) {
    return true;
}

function parse_endpoint(val) {
    val = val.trim();
    if (val.length == 0) {
        throw new Error('Server endpoint cannot be an empty string.');
    }
    return val;
}

function parse_key(val) {
    val = val.trim();
    if (val.length == 0) {
        throw new Error('Key as used by WireGuard cannot be an empty string.');
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

    if (this.addr.kind() == 'ipv4') {
        var networkID = parser.networkAddressFromCIDR(this.src);
        if (this.str == networkID) {
            throw new Error('Please use a real host IP address, not a network identifier.');
        }
        var broadcast = parser.broadcastAddressFromCIDR(this.src);
        if (this.str == broadcast) {
            throw new Error('Please use a real host IP address, not a broadcast address.');
        }
    }
}

IPAddr.prototype.for_client = function() {
    return this.str + '/' + this.netmask;
}

IPAddr.prototype.for_server = function() {
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

Input.prototype.value = function() {
    return $(this.input_id()).val();
}

Input.prototype.show_error = function(msg) {
    $(this.error_id()).text(msg);
    $(this.error_id()).show();
}

Input.prototype.hide_error = function() {
    $(this.error_id()).hide();
}

var Value = function(name, parser) {
    this.input = new Input(name);
    this.parser = parser;

    this.value = null;
    this.error = null;
    try {
        this.value = parser(this.input.value());
        this.input.hide_error();
    } catch (err) {
        this.error = err.message;
        this.input.show_error(this.error);
    }
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

var Data = function() {
    this.server_endpoint  = new Endpoint('server_endpoint');
    this.server_public    = new Key('server_public_key');
    this.server_preshared = new Key('server_preshared_key');
    this.client_public    = new Key('client_public_key');
    this.client_private   = new Key('client_private_key');
    this.client_ipv4      = new IPv4('client_ipv4');
    this.client_ipv6      = new IPv6('client_ipv6');

    this.values = [
        this.server_endpoint,
        this.server_public,
        this.server_preshared,
        this.client_public,
        this.client_private,
        this.client_ipv4,
        this.client_ipv6
    ];

    if (this.has_errors()) {
        this.show_error('Please correct the input errors above first.');
    } else {
        this.hide_error();
    }
}

Data.prototype.has_errors = function() {
    var has = false;
    this.values.forEach(function(value) {
        if (value.error) {
            has = true;
        }
    });
    return has;
}

Data.prototype.show_error = function(msg) {
    $('#params_error').text(msg);
    $('#params_error').show();
}

Data.prototype.hide_error = function() {
    $('#params_error').hide();
}

var ConfigFile = function(name, contents) {
    this.name = name;
    this.contents = contents;
}

ConfigFile.prototype.toString = function() {
    return this.contents;
}

var Script = function(text) {
    this.text = text;
}

Script.prototype.toString = function() {
    return this.text;
}

function wg_quick_client_file(data) {
    var path = `/etc/wireguard/${iface}.conf`;
    return new ConfigFile(path,
`# On the client, put this to ${path} and either start the
# the wg-quick@${iface} systemd service, or run \`wg-quick up ${iface}\`.

[Interface]
PrivateKey = ${data.client_private.value}

[Peer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.server_preshared.value}
AllowedIPs = ${data.client_ipv4.value.for_client()}, ${data.client_ipv6.value.for_client()}
PersistentKeepalive = ${persistent_keepalive}
`);
}

function wg_quick_server_file(data) {
    var path = `/etc/wireguard/${iface}.conf`;
    return new ConfigFile(path,
`# On the server, add this to ${path} and either restart
# the wg-quick@${iface} systemd service, or run \`wg syncconf ${iface}
# ${path}\`.

# Previous contents goes here...

[Peer]
PublicKey = ${data.client_public.value}
PresharedKey = ${data.server_preshared.value}
AllowedIPs = ${data.client_ipv4.value.for_server()}, ${data.client_ipv6.value.for_server()}
`);
}

function systemd_client_netdev_file(data) {
    var path = `/etc/systemd/network/${iface}.netdev`;
    return new ConfigFile(path,
`# On the client, you need two files. Put this into ${path}
# and after you're done with both files, restart the systemd-networkd service.

[NetDev]
Name = ${iface}
Kind = wireguard

[WireGuard]
PrivateKey = ${data.client_private.value}

[WireGuardPeer]
Endpoint = ${data.server_endpoint.value}
PublicKey = ${data.server_public.value}
PresharedKey = ${data.server_preshared.value}
AllowedIPs = ${data.client_ipv4.value.for_client()}, ${data.client_ipv6.value.for_client()}
PersistentKeepalive = ${persistent_keepalive}
`);
}

function systemd_client_network_file(data) {
    var path = `/etc/systemd/network/${iface}.network`;
    return new ConfigFile(path,
`# This is the second file. Put this into ${path}
# and if you're done the first file already, restart the systemd-networkd
# service.

[Match]
Name = ${iface}

[Network]
Address = ${data.client_ipv4.value.for_client()}
Address = ${data.client_ipv6.value.for_client()}
`);
}

function systemd_server_netdev_file(data) {
    var path = `/etc/systemd/network/${iface}.netdev`;
    return new ConfigFile(path,
`# On the server, add this to ${path} and restart
# the systemd-networkd service.

# Previous contents goes here...

[WireGuardPeer]
PublicKey = ${data.client_public.value}
PresharedKey = ${data.server_preshared.value}
AllowedIPs = ${data.client_ipv4.value.for_server()}, ${data.client_ipv6.value.for_server()}
`);
}

function nmcli_client_file(data) {
    var path = `/etc/NetworkManager/system-connections/${iface}.nmconnection`;
    return new ConfigFile(path,
`# On the client, put this to ${path}
# and run \`nmcli c reload && nmcli c up ${iface}\`.

[connection]
id=${iface}
type=wireguard
interface-name=${iface}

[wireguard]
private-key=${data.client_private.value}
private-key-flags=0

[wireguard-peer.${data.server_public.value}]
endpoint=${data.server_endpoint.value}
preshared-key=${data.server_preshared.value}
preshared-key-flags=0
allowed-ips=${data.client_ipv4.value.for_client()};${data.client_ipv6.value.for_client()};
persistent-keepalive=${persistent_keepalive}

[ipv4]
address1=${data.client_ipv4.value.for_client()}
method=manual

[ipv6]
address1=${data.client_ipv6.value.for_client()}
method=manual
`);
}

function nmcli_server_file(data) {
    var path = `/etc/NetworkManager/system-connections/${iface}.nmconnection`;
    return new ConfigFile(path,
`# On the server, add this to ${path}
# and run \`nmcli c reload && nmcli c up ${iface}\';

# Previous contents goes here...

[wireguard-peer.${data.client_public.value}]
preshared-key=${data.server_preshared.value}
preshared-key-flags=0
allowed-ips=${data.client_ipv4.value.for_server()};${data.client_ipv6.value.for_server()};
`);
}

function manual_client_script(data) {
    return new Script(
`# On the client, run this to set up a connection.
# Make sure your .bash_history or whatever is secure before running this.

ip link add dev ${iface} type wireguard
ip addr add ${data.client_ipv4.value.for_client()} dev ${iface}
ip addr add ${data.client_ipv6.value.for_client()} dev ${iface}
wg set ${iface} private-key <( echo ${data.client_private.value} )
wg set ${iface} peer ${data.server_public.value} preshared-key <( echo ${data.server_preshared.value} ) endpoint ${data.server_endpoint.value} allowed-ips ${data.client_ipv4.value.for_client()},${data.client_ipv6.value.for_client()}
ip link set ${iface} up
`);
}

function manual_server_script(data) {
    return new Script(
`# On the server, run this to tweak an existing connection.
# Make sure your .bash_history or whatever is secure before running this.

wg set ${iface} peer ${data.client_public.value} preshared-key <( echo ${data.server_preshared.value} ) allowed-ips ${data.client_ipv4.value.for_server()},${data.client_ipv6.value.for_server()}
`);
}

var InstructWgQuick = function() {}

InstructWgQuick.prototype.name = function() { return 'wg-quick'; }

InstructWgQuick.prototype.for_client = function(data) {
    return [wg_quick_client_file(data)];
}

InstructWgQuick.prototype.for_server = function(data) {
    return [wg_quick_server_file(data)];
}

var InstructSystemd = function() {}

InstructSystemd.prototype.name = function() { return 'systemd-networkd'; }

InstructSystemd.prototype.for_client = function(data) {
    return [systemd_client_netdev_file(data), systemd_client_network_file(data)];
}
InstructSystemd.prototype.for_server = function(data) {
    return [systemd_server_netdev_file(data)];
}

var InstructNetworkManager = function() {}

InstructNetworkManager.prototype.name = function() { return 'NetworkManager'; }

InstructNetworkManager.prototype.for_client = function(data) {
    return [nmcli_client_file(data)];
}

InstructNetworkManager.prototype.for_server = function(data) {
    return [nmcli_server_file(data)];
}

var InstructManual = function() {}

InstructManual.prototype.name = function() { return 'Manual'; }

InstructManual.prototype.for_client = function(data) {
    return [manual_client_script(data)];
}

InstructManual.prototype.for_server = function(data) {
    return [manual_server_script(data)];
}

function clear_instructors() {
    $('#instructors').empty();
}

function format_instructions(instructions) {
    var container = $('<div/>');
    instructions.forEach(function(instruction) {
        container.append($('<pre/>').text(instruction.toString()));
    });
    return container;
}

function format_server_instructions(instructor, data) {
    return format_instructions(instructor.for_server(data));
}

function format_client_instructions(instructor, data) {
    return format_instructions(instructor.for_client(data));
}

function add_instructor(instructor, data) {
    $('#instructors').append($('<div/>')
        .append($('<h2/>').text(instructor.name()))
        .append($('<div class="row"/>')
            .append($('<div class="col-md-6"/>')
                .append(format_server_instructions(instructor, data)))
            .append($('<div class="col-md-6"/>')
                .append(format_client_instructions(instructor, data)))));
}

function form_on_submit() {
    clear_instructors();

    var data = new Data();
    if (data.has_errors()) {
        return false;
    }

    var instructors = [
        new InstructWgQuick(),
        new InstructSystemd(),
        new InstructNetworkManager(),
        new InstructManual()
    ];

    instructors.forEach(function(instructor) {
        add_instructor(instructor, data);
    });

    return false;
}
