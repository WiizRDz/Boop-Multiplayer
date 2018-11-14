# Boop-Multiplayer

Mulitplayer remake of https://joshbra.gg/boop/ that allows you to play between two different devices on same network

### Dependencies:
  - Node.js
  - Socket.io
  - Express

### How to run:
  - Make sure Node.js is installed and configured on your machine (https://nodejs.org/en/download/)
  - Execute the app.js file using Node.js to host localhost server
  - Machines on the same network can connect to your machine using port :2000 to play the game
    - If you are the host then go to "localhost:2000" or if on the same network "192.168.0.xxx:2000" (Find out your devices ip address then port 2000)
    
### How to play:
  - Use either WASD or Arrow Keys for controls
  - Move left and right using arrows or A/D
  - Jump using up arrow or W (you can triple jump)
  - If you are the defender you can use down arrow or D to boop the enemy back
  - Roles
    - Defender
      - Your goal is to block and boop the attacker to hold them off long enough until the timer at the bottom of the screen runs out
    - Attacker
      - Your goal is to try and get to the other end of the screen where the blue goal is
  - If the attacker makes it to the goal the players positions will be reset and the roles will switch
  - Every round the timer decreases at a faster rate
  - You can use the +/- buttons to increase and decrease the round number which will manually adjust the timer speed
  
### Notes:
  - If you are playing on devices with two different screen sizes the game will choose the smaller of the two screens for both players to play on (If the screen does not set properly then simply refresh the page of the larger screened device to fix problem)
