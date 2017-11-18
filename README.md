To run the server, run node -v first and check the version. You can then use "nvm use --delete-prefix v6.9.5" to change to node version 6.9.5 To install the dependencies, you use 'npm install'. This will create the nodes_modules. If you run into error cannot find .../.../node_sqlite3.node. You will need to "npm install any-db-sqlite3". You shouldn't run into this setup error if you setup with my instructions but for some reason this module gave me errors in the past and installing it again was a fix. From there, you can start the server with node server.js. It will run on handin in the port address 8000, but this can be changed in the server.js file. To restart the db, just delete the 'chatroom.db' file.

For the realtime change, I filled all requirements. I no longer poll the server for new messages and instead use socket.io. My new chatroom also shows for each room, a list of its users and when a user disconnects his socket (close window), the user list reflects that. I didn't add any other extra features.

Known bugs: none that I have seen


