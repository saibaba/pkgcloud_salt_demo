Install node.js stuff
=====================
apt-get install nodejs
apt-get install npm

Create a directory, say demo and change into this directory.

Install other libraries
=======================

Install control (ssh client)
----------------------------
npm install control

Install pkgcloud
----------------

npm install pkgcloud

Sample
======

Copy mainsalt.js to this directory

Help
----

nodejs mainsalt.js

Example Run
===========

The demo script creates a VM, and installs apache2 by injecting salt config and then running masterless salt minion command inside VM.
Delete VM from your account later to avoid charges.

1) Create a public/private key pair (make sure permissons are 600 for private key file).

   ssh-keygen -q -t rsa -f demo_key -N ""

2) Run demo app

   nodejs mainsalt.js demo_server  demo_key <user> <apikey>  ORD

   Note the IP of VM created.


3) Verify install

   curl -X GET http://IP/
