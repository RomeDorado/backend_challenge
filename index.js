/**
 * Module that loads environment 
 * variables from a .env file
 */
require("dotenv").config();

const restify = require("restify");
const restifyCors = require("restify-cors-middleware")({
  origins: ["*"],
  allowHeaders: ["*"],
  exposeHeaders: ["*"]
});

/**
 * Config
 */
const config = require("./src/config");

/**
 * Initialize Server
 */
const server = restify.createServer({
  name: config.node.name,
  version: config.node.version
});

/** 
 * Bundled Plugins
 */
server.pre(restifyCors.preflight);
server.use(restifyCors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.jsonp());
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.fullResponse());

/**
 * CORS
 */
server.pre(restifyCors.preflight);
server.use(restifyCors.actual);

/**
 * Start server & require route files
 */

require("./src/routes")(server);

require("./src/helpers/sql-helper");

server.listen(config.node.port, () => {
    console.log("Listening to port =>", server.url);
});