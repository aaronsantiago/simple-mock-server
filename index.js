
import fs from 'fs';
import fsp from 'fs/promises';
import cors from "cors";
import process from "process";
import express from "express";

let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = express();

let configPath = "config.json";
if (process.argv.length > 2) {
  configPath = process.argv[2];
}
let config = JSON.parse(fs.readFileSync(configPath, "utf8"));
console.log(config);

app.use(express.json({limit: "500mb"})); // for parsing application/json
app.use(express.urlencoded({limit: "500mb"}));
app.use(cors());

app.post("*", (req, res) => {
  handleRequest(req, res, "POST");
});

app.get("*", (req, res) => {
  handleRequest(req, res, "GET");
});

app.put("*", (req, res) => {
  handleRequest(req, res, "PUT");
});

app.options("*", (req, res) => {
  handleRequest(req, res, "OPTIONS");
});

async function convertObject(obj, index){
  console.log(obj, index);
  let newObj = {};
  for(let key of Object.keys(obj))
  {
    if (typeof obj[key] === "object") {
      newObj[key] = await convertObject(obj[key], index);
    } else if (typeof obj[key] === "string") {
      let value = obj[key];
      while (value.includes(config.responseReplacementIndicator + config.responseReplacementOpenBracket)) {
        let start = value.indexOf(config.responseReplacementIndicator + config.responseReplacementOpenBracket);
        let end = value.indexOf(config.responseReplacementCloseBracket, start);
        let variable = value.substring(start + config.responseReplacementIndicator.length + config.responseReplacementOpenBracket.length, end);

        let index = parseInt(variable);
        console.log(variable, config, config.files, config.files[0], index, config.files[index]);
        let replacement = await fsp.readFile(config.files[index], {encoding: 'base64'});
        value = value.substring(0, start) + replacement + value.substring(end + config.responseReplacementCloseBracket.length);
      }
      newObj[key] = value;
    }
    else {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

let currentFileIndex = 0;
async function handleRequest(req, res, method) {
  let fileIndex = currentFileIndex++;
  if (config.randomizeOrder) {
    fileIndex = Math.floor(Math.random() * config.files.length);
  }
  let waitTime = config.baseTime + Math.random() * config.addRandomTime;
  await sleep(waitTime);

  try {
      console.log("executing request", req.url);
      if (config.asJson) {
        let response = structuredClone(config.responseFormat);
        response = await convertObject(response, fileIndex);
        res.json(response);
      }
      else {
        res.sendFile(config.files[fileIndex]);
      }
    }
    catch (e) {
      console.log("error with request");
      console.log(e);
      res.end("error");
    }
};

let port = config.port;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
