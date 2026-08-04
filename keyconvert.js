const fs = require("fs");
const key = fs.readFileSync("./ans-shift-firebase-adminsdk.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);

// const fs = require("fs");

// const json = fs.readFileSync("./ans-shift-firebase-adminsdk.json", "utf8");

// const base64 = Buffer.from(json, "utf8").toString("base64");

// console.log(base64);
