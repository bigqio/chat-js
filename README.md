# chat-js
Simple chat app in Javascript leveraging BigQ

This app takes advantage of the Websocket interface in BigQ.  You can communicate and share with other Websocket-connected or TCP-connected nodes.

## help or feedback
first things first - do you need help or have feedback?  Contact me at joel at maraudersoftware.com dot com or file an issue here!

## important
be sure to install the necessary modules 'ws' and 'prompt'
```
npm install ws
npm install prompt
```

## other code
other code files are included which may be helpful in integrating BigQ including:
- msg_parser.js and sample_msg.txt

## performance
bigq is still early in development.  While we have high aspirations on performance, it's not there yet.  The software has excellent stability in lower throughput environments with lower rates of network change (adds, removes).  Performance will be a focus area in the coming releases.

## execution
running the code is simple:
```
node bigq-js-chat.js
```