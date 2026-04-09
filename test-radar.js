const { io } = require("socket.io-client");
const socketA = io("http://localhost:5000", { transports: ["websocket"] });
socketA.on("connect", () => { console.log("A connected"); });
