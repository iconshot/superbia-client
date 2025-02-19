# [@superbia/client](https://superbia.dev/client)

Connect to a Superbia server.

## Installation

```
npm i @superbia/client
```

Available on browser and Node.

## Get started

#### Browser

```js
import { Client } from "@superbia/client";

const client = new Client({
  url: "http://localhost:8080", // server url
  wsUrl: "ws://localhost:8080", // websocket url
  fetch, // window.fetch
  WebSocket, // window.WebSocket
  FormData, // window.FormData
});
```

#### Node

```
npm i node-fetch ws form-data
```

```js
const { Client } = require("@superbia/client");

const fetch = require("node-fetch");
const WebSocket = require("ws");
const FormData = require("form-data");

const client = new Client({
  url: "http://localhost:8080", // server url
  wsUrl: "ws://localhost:8080", // websocket url
  fetch, // node-fetch package
  WebSocket, // ws package
  FormData, // form-data package
});
```

## Requests

You can access multiple endpoints in a single request.

```js
const response = await client.request({
  user: { userId: "1" },
  userPosts: { userId: "1", first: 20 },
});

const result = response.result(); // { user: {...}, userPosts: {...} }
```

## Uploads

#### Browser

```js
import { Upload } from "@superbia/client";

const input = document.getElementById("input");

const file = input.files[0];

const response = await client.request({
  uploadPhoto: { upload: new Upload(file) },
});

const result = response.result(); // { uploadPhoto: null }
```

#### Node

```js
const fs = require("fs");

const { Upload } = require("@superbia/client");

const stream = fs.createReadStream("./photo.jpg");

const response = await client.request({
  uploadPhoto: { upload: new Upload(stream) },
});

const result = response.result(); // { uploadPhoto: null }
```

## Subscriptions

Subscriptions use `WebSocket` under the hood.

```js
client.init(); // create WebSocket connection

const subscription = client.subscribe({ counter: null });

subscription.on("result", (result) => {
  // { counter: Int }
});
```

## Headers

Headers can be passed to the server for both requests and subscriptions.

```js
const headers = {
  Authorization: "Bearer _TOKEN_",
  "Accept-Language": "en",
};

client.update(headers);

// this request will pass the new headers

const response = await client.request({ userPosts: { userId: "1" } });

// create the WebSocket with the new headers

client.init();

const subscription = client.subscribe({ newPost: { userId: "1" } });
```
