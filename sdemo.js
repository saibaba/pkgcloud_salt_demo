var  fs = require("fs");

if (process.argv.length != 7) {
    console.log("nodejs sdemo.js server_name key username apikey region");
    process.exit(1);
}

// Details of public/private key pair used to set up the newly created server's SSH configuration.
var privkey_file = process.argv[3];
var pubkey_file = privkey_file + ".pub";
var pubkey_contents = fs.readFileSync(pubkey_file);

// VM configuration
var server_name = process.argv[2];
var flavor = "2";
var image = "7437239b-bf92-4489-9607-889be189e772";

// bootstrap salt configurations
var salt_top_contents = fs.readFileSync("top.sls");
var salt_webserver_contents = fs.readFileSync("webserver.sls");

// Connect to rackspace service provider
var client = require('pkgcloud').compute.createClient({
    provider: 'rackspace',
    username: process.argv[4],
    apiKey: process.argv[5],
    authUrl: 'https://identity.api.rackspacecloud.com',
    region: process.argv[6]
});

// with createClient, useInternal: true   if want to use servicenet endpoint

// bootstrap is a function that is  used to configure/install software in a newly created VM. It just install a couple of apps.
function bootstrap(server) {
    var control = require("control");
    var shared = Object.create(control.controller);
    shared.user = "root";
    var addresses  = server.addresses.public;
    var addr = "";
    for (var i = 0; i < addresses.length; i++) {
        if (addresses[i].version == 4) {
            addr = addresses[i].addr;
        }
    }
    console.log("VM IP: " + addr);
    var controllers = control.controllers([addr], shared);
    controllers[0].sshOptions = [ "-i" , privkey_file , "-o", "StrictHostKeyChecking=no"];
    var callback = function() {
        console.log("ssh started...");
    }
    
    controllers[0].ssh('date', function() {
        console.log("ssh for date exited");
        controllers[0].ssh('apt-get update', function() {
            console.log("ssh for apt-get update exited");
            controllers[0].ssh('wget -O - http://bootstrap.saltstack.org | sudo sh', function() { 
                console.log("ssh for install saltstack (minion) exited");
                controllers[0].ssh('salt-call --local state.highstate -l debug', function() {
                    console.log("ssh for invoking minion in masterless mode exited");
                    controllers[0].ssh("sed -i 's/this server/server " + server_name  + "/' /var/www/index.html", function() {
                        console.log("ssh for editing index.html to identify the server exited");
                    });
                });
            });
        } );
    });
}

// handleServerResponse is a (callback) function invoked when  a new server is created. It waits for the server is ready and then calls bootstrap.
function handleServerResponse(err, server) {
  if (err) {
    console.dir(err);
    return;
  }
  console.log(client.identity.token.id);

  console.log('SERVER CREATED: ' + server.name + ', waiting for active status');

  // Wait for status: ACTIVE on our server, and then callback
  server.setWait({ status: server.STATUS.running }, 5000, function (err) {
    if (err) {
      console.dir(err);
      return;
    }

    console.log('SERVER INFO');
    console.log(server.name);
    console.log(server.status);
    console.log(server.id);

    console.log('Make sure you DELETE server: ' + server.id + ' in order to not accrue billing charges');
    bootstrap(server);
  });
}

// Create a new server
client.createServer({
  name: server_name,
  flavor: flavor,  
  image: image,   
  personality: [ 
      { path: "/root/.ssh/authorized_keys" , contents: pubkey_contents.toString('base64') },
      { path: "/srv/salt/top.sls" , contents: salt_top_contents.toString('base64') },
      { path: "/srv/salt/webserver.sls" , contents: salt_webserver_contents.toString('base64') }
  ]
}, handleServerResponse);
