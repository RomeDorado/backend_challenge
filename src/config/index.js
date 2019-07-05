module.exports.node = {
  name: require("./../../package.json").name,
  version: require("./../../package.json").version,
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 4000,
};

module.exports.sql = {
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database
}