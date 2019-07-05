const mysql = require("mysql")
const config = require("../config")
/**
 * This helper is used to share the pool connection throughout the application
 */

const initializeConnection = () => {
    async function handleDisconnect(connection) {
        connection.on("error", function (error) {
            if (error instanceof Error) {
                initializeConnection(connection.config);
            }
        });
    }

    var connection = mysql.createPool(config.sql);

    // if connection disconnects
    handleDisconnect(connection);

    // connection.connect();
    return connection;
}

module.exports = initializeConnection();
