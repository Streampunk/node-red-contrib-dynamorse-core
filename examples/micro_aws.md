.Launch instance - t2.micro with Ubuntu 16 LTS.

Install Node.JS 8 LTS using [these instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions).

    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
Install build essentials for native extensions.

    sudo apt-get install -y build-essential
    
Istall node-red

    sudo npm install -g node-red --user-root
    
Add firewall rules for the following ports. All _Custom TCP_, all _0.0.0.0/0_.

* 1880 - web access to Node-RED
* 3101 - NMOS node API
* 8712 - HTTP/S media transport

Upload content:

    scp -i "sparkpunkeu.pem" ../media/sound/BBCNewsCountdown.wav "ubuntu@<host>:."
    
Use manage palette to install:

* node-red-contrib-dynamorse-core
* node-red-contrib-dynamotse-file-io

Use `curl` to install http-io module.

    curl -d '{"module": "node-red-contrib-dynamorse-http-io"}' -H 'Content-Type: application/json' <host>:1880/nodes
    
Create a flow WAV-in to grain-xray to HTTP out.

Remember to terminate and destroy the instance once done.
