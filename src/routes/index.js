const controller = require("../controller");
/**
 * Define endpoints
 */
module.exports = server => {  
    server.post("/api/auth", controller.authenticate);
    server.post("/api/create", controller.create);
    server.get("/api/employee/:id", controller.getEmployee);
    server.get("/api/manager/employee", controller.getManagedEmployees);
    server.get("/api/manager/:id/employee", controller.getEmployeesByManager);
    server.get("/api/search", controller.search);
    server.put("/api/update/:id", controller.update);
    server.del("/api/delete/:id", controller.delete);
    server.post("/api/logout", controller.logout);
}