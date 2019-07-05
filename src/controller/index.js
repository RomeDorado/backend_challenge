/**
 * Declare libraries needed
 */
const bcrypt = require("bcrypt"),
    response = require("../helpers/response"),
    jwt = require("../helpers/jwt-helper"),
    _ = require("underscore"),
    sql = require("../helpers/sql-helper"),
    globals = require("../helpers/globals"),
    sql_query = require("../helpers/queries");


/**
 * A Function that validates JWT tokens passed per request
 */
const validateRequest = async (req, res, next) => {
    const checkToken = () => {
        const token = req.headers["authorization"]
        if (!token) {
            return response.failure(res, next, "An Authorization Token is required", 401, response.HTTP_STATUS_CODES.unauthorized);
        } else {
            return token;
        }
    }

    const validateToken = async (token) => {
        const data = await jwt.validateToken(token);
        return data;
    }

    async function main() {
        //check if a token is present in the header
        const token = await checkToken();
        //validate the token
        const user = await validateToken(token);
        if (token) {
            //check if the token is valid & return the data
            if (user) {
                return user;
            } else {
                response.failure(res, next, "Invalid Token", 401, response.HTTP_STATUS_CODES.unauthorized);
            }
        }
    }
    //return the user details from the decoded token
    return main();
}

/**
 * Login Endpoint
 */
module.exports.authenticate = (req, res, next) => {
    const getPassFromEmail = async () => {
        const { email } = req.body;
        var pass = {};
        return new Promise((resolve, reject) => {
            sql.getConnection(function (error, connection) {
                if (error) {
                    return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
                }
                connection.query(sql_query.LOGIN_QUERY,
                    [email],
                    async function (error, results, fields) {
                        if (error) {
                            return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                        }
                        connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                        if (results && results.length > 0) {
                            pass = {
                                id: results[0].id,
                                password: results[0].password
                            };
                            resolve(pass);
                        } else {
                            response.failure(res, next, "Account not found!", 404, response.HTTP_STATUS_CODES.not_found);
                        }
                    });
            });
        });
    }

    const validatePassword = async (userData) => {
        const { password } = req.body;
        return new Promise((resolve, reject) => {
            //check if entered password match with the hashed account password through bcrypt
            bcrypt.compare(
                password,
                userData.password,
                async (error, match) => {
                    if (!match) {
                        response.failure(res, next, "Email/password doesn't match.", 401, response.HTTP_STATUS_CODES.unauthorized);
                    } else {
                        //I've only included the user's ID inside the token
                        const id = { id: userData.id }
                        var token = jwt.generateToken(id);
                        resolve(token);
                    }
                }
            );
        });
    }

    const updateLoggedIn = (userData, token) => {
        return new Promise((resolve, reject) => {
            sql.getConnection(function (error, connection) {
                if (error) {
                    return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
                }
                connection.beginTransaction(function (error) {
                    if (error) {
                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                    }
                    connection.query(sql_query.LOGINANDOUT_QUERY,
                        [1, userData.id],
                        async function (error, results, fields) {
                            if (error) {
                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                            }
                            connection.commit(function (error) {
                                if (error) {
                                    return connection.rollback(function () {
                                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                    });
                                }
                                connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                                //verify if loggedin column is updated
                                if (results.changedRows > 0) {
                                    response.success(res, next, token, 200, response.HTTP_STATUS_CODES.ok, "Logged in successfully!");
                                    // resolve(true)
                                } else {
                                    response.failure(res, next, "This account is logged in on another computer", 403, response.HTTP_STATUS_CODES.forbidden);
                                    // resolve(false)
                                }
                            });
                        });
                });
            });
        });
    }

    async function main() {
        try {
            //get user data from email
            const userData = await getPassFromEmail();
            //generate user token
            const token = await validatePassword(userData);
            //update loggedin to true if validated
            const logged = await updateLoggedIn(userData, token);
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Create an employee
 */

//TODO: check if token is working
module.exports.create = (req, res, next) => {
    const validateInput = async (
        corporate_email,
        personal_email, birthdate,
        password) => {

        var inputErrorMsg = "",
            emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            //YYYY-MM-DD
            dateRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/,
            //Minimum eight characters, at least one letter, one number and one special character:
            passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

        //email validation
        if (!emailRegex.test(personal_email))
            inputErrorMsg += "Invalid personal email address format\n";

        if (!emailRegex.test(corporate_email))
            inputErrorMsg += "Invalid corporate email address format\n";

        //date validation
        if (!dateRegex.test(birthdate))
            inputErrorMsg += "Birthdate must follow the YYYY-MM-DD format\n";

        //password strength validation
        if (!passwordRegex.test(password))
            inputErrorMsg += "Password must be minimum of eight characters, at least one letter, one number and one special character\n";

        return inputErrorMsg;
    }

    const insertEmployee = async (
        user_id, first_name, last_name, corporate_email,
        personal_email, birthdate, job_function,
        manager, password) => {

        var errorMsg = "";

        /**
         * used bcrypt for hashing with a saltround value of 10
         * calculation is done 2^10 times
         * */
        password = bcrypt.hashSync(password, 10);

        // execute queries
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.beginTransaction(function (error) {
                if (error) {
                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                }

                //get the job function of the user
                connection.query(sql_query.SELECT_JOB_FUNCTION_BY_ID_QUERY,
                    [user_id], function (error, results, fields) {
                        if (error) {
                            return connection.rollback(function () {
                                response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                            });
                        }
                        const job = results[0].job_function;

                        //check if the user is valid to execute the request by job function
                        if (job && globals.validRoles.includes(job)) {
                            connection.query(sql_query.CREATE_TABLE_QUERY, function (error, results, fields) {
                                if (error) {
                                    return connection.rollback(function () {
                                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                    });
                                }

                                connection.query(sql_query.INSERT_QUERY,
                                    [null, first_name, last_name, corporate_email, personal_email,
                                        birthdate, job_function, manager, password, 0],
                                    function (error, results, fields) {
                                        if (error) {
                                            return connection.rollback(function () {
                                                //error handling
                                                if (error.code == "ER_DUP_ENTRY") errorMsg = "The email address you entered is already taken."
                                                else errorMsg = error
                                                response.failure(res, next, errorMsg, 400, response.HTTP_STATUS_CODES.bad_request);
                                            });
                                        }
                                        connection.commit(function (error) {
                                            if (error) {
                                                return connection.rollback(function () {
                                                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                                });
                                            }
                                            connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                                            //verify if the data is successfully inserted
                                            if (results && results.affectedRows > 0) {
                                                response.success(res, next, req.body, 201, response.HTTP_STATUS_CODES.created, "Account successfully created!")
                                            }
                                        });
                                    });
                            });
                        } else {
                            response.failure(res, next, "Current job function cannot perform this request", 401, response.HTTP_STATUS_CODES.unauthorized);
                        }

                    }); //closing of first query
            });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const id = user.data.id
                //validate user input from request

                //declare variables
                const { first_name, last_name, corporate_email,
                    personal_email, birthdate, job_function,
                    manager = null, password } = req.body;

                //check if inputs are valid
                const checkInputError = await validateInput(
                    corporate_email,
                    personal_email, birthdate,
                    password);

                if (checkInputError) {
                    response.failure(res, next, checkInputError, 400, response.HTTP_STATUS_CODES.bad_request);
                } else {
                    //insert the employee details
                    const insert = await insertEmployee(
                        id, first_name, last_name, corporate_email,
                        personal_email, birthdate, job_function,
                        manager, password);
                }
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Get an employee by id
 */
module.exports.getEmployee = (req, res, next) => {
    const getDetails = (id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.query(sql_query.SELECT_BY_ID_QUERY,
                [id],
                async function (error, results, fields) {
                    if (error) {
                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                    }
                    connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                    if (results.length > 0) {
                        //success get
                        response.success(res, next, results[0], 200, response.HTTP_STATUS_CODES.ok, "Account successfully fetched!")
                    } else {
                        //not found
                        response.failure(res, next, "Account not found!", 404, response.HTTP_STATUS_CODES.not_found);
                    }
                });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const { id } = req.params
                //get employee's detail by id
                const details = await getDetails(id)
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Get a manager’s employees when logged in as manager
 */
module.exports.getManagedEmployees = (req, res, next) => {
    //You must be logged in as a manager to use this endpoint 
    const getEmployees = (manager_id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.query(sql_query.SELECT_BY_NANAGER_ID_QUERY,
                [manager_id],
                async function (error, results, fields) {
                    if (error) {
                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                    }
                    connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                    if (results.length > 0) {
                        response.success(res, next, results, 200, response.HTTP_STATUS_CODES.ok, "Employees successfully fetched!")
                    } else {
                        //not found
                        response.failure(res, next, "No employees found!", 404, response.HTTP_STATUS_CODES.not_found);
                    }
                });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const manager_id = user.data.id
                //get employees under him/her
                const getManaged = await getEmployees(manager_id);
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Get a manager’s employees by manager id
 */
module.exports.getEmployeesByManager = (req, res, next) => {
    const getEmployees = (id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.query(sql_query.SELECT_BY_NANAGER_ID_QUERY,
                [id],
                async function (error, results, fields) {
                    if (error) {
                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                    }
                    connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                    if (results.length > 0) {
                        response.success(res, next, results, 200, response.HTTP_STATUS_CODES.ok, "Employees successfully fetched!")
                    } else {
                        //not found
                        response.failure(res, next, "No employees found!", 404, response.HTTP_STATUS_CODES.not_found);
                    }
                });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const { id } = req.params;
                //get employees of a manager by id
                const employees = await getEmployees(id);
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Search employee by job function
 */
module.exports.search = (req, res, next) => {
    const getEmployees = (job_function) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            //selecting all columns except password
            connection.query(sql_query.SEARCH_BY_JOB_FUNCTION_QUERY,
                [job_function],
                async function (error, results, fields) {
                    if (error) {
                        return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                    }
                    connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                    if (results.length > 0) {
                        response.success(res, next, results, 200, response.HTTP_STATUS_CODES.ok, "Employees successfully fetched!")
                    } else {
                        //not found
                        response.failure(res, next, "No employees found!", 404, response.HTTP_STATUS_CODES.not_found);
                    }
                });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const { job_function } = req.query;
                //search for employees by job function
                const search = await getEmployees(job_function);
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Update an employee
 */
module.exports.update = (req, res, next) => {
    const validateInput = async (
        updateData) => {

        const { corporate_email,
            personal_email, birthdate,
            password } = updateData;

        var inputErrorMsg = "",
            emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            //YYYY-MM-DD
            dateRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/,
            //Minimum eight characters, at least one letter, one number and one special character:
            passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

        //email validation
        if (personal_email && !emailRegex.test(personal_email))
            inputErrorMsg += "Invalid personal email address format\n";

        if (corporate_email && !emailRegex.test(corporate_email))
            inputErrorMsg += "Invalid corporate email address format\n";

        //date validation
        if (birthdate && !dateRegex.test(birthdate))
            inputErrorMsg += "Birthdate must follow the YYYY-MM-DD format\n";

        //password strength validation
        if (password && !passwordRegex.test(password))
            inputErrorMsg += "Password must be minimum of eight characters, at least one letter, one number and one special character\n";

        return inputErrorMsg;
    }

    const updateEmployee = (user_id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.beginTransaction(function (error) {
                if (error) {
                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                }
                connection.query(sql_query.SELECT_JOB_FUNCTION_BY_ID_QUERY,
                    [user_id], async function (error, results, fields) {
                        if (error) {
                            return connection.rollback(function () {
                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                            });
                        }

                        const job_function = results[0].job_function;

                        //check if the user is valid to execute the request by job function
                        if (job_function && globals.validRoles.includes(job_function)) {
                            const updateObject = req.body;
                            const { id } = req.params
                            var query = `SET`;

                            //concatenate every key from the request object
                            //this is to enable dynamic update based on the request
                            for (var key in updateObject) {
                                //check if manager wants to update his/her own profile
                                if (id == user_id) {
                                    //concatenate the key (which is the column name) to the query
                                    query += ` ${key} = ?,`
                                } else {
                                    //I'm assuming if the front-end still passes restricted fields for update, 
                                    //I have to add restriction and return an error message
                                    if (globals.restrictedData.includes(key)) {
                                        return response.failure(res, next, "The data you want to update is restricted", 400, response.HTTP_STATUS_CODES.bad_request);
                                    } else {
                                        //concatenate the key (which is the column name) to the query
                                        query += ` ${key} = ?,`
                                    }
                                }
                            }

                            //check if inputs are valid
                            const checkInputError = await validateInput(updateObject);

                            if (checkInputError) {
                                return response.failure(res, next, checkInputError, 400, response.HTTP_STATUS_CODES.bad_request);
                            } else {

                                //removes the last comma in the string
                                query = query.substring(0, query.length - 1);
                                //hash the password (if exists) from the updateObject before saving
                                if (updateObject.password) updateObject.password = bcrypt.hashSync(updateObject.password, 10);
                                //get the values from the request object
                                var values = _.values(updateObject)
                                //add the values to an array
                                values.push(id)

                                //update employee
                                connection.query(`UPDATE employees ${query} WHERE id = ?`,
                                    values,
                                    async function (error, results, fields) {
                                        if (error) {
                                            return connection.rollback(function () {
                                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                            });
                                        }
                                        connection.commit(function (error) {
                                            if (error) {
                                                return connection.rollback(function () {
                                                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                                });
                                            }
                                            connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                                            //verify if the data is successfully inserted
                                            if (results && results.affectedRows > 0) {
                                                response.success(res, next, req.body, 200, response.HTTP_STATUS_CODES.ok, "Account successfully updated!")
                                            } else {
                                                //not found
                                                response.failure(res, next, "Account not found!", 404, response.HTTP_STATUS_CODES.not_found);
                                            }
                                        });
                                    });
                            }
                        } else {
                            response.failure(res, next, "Current job function cannot perform this request", 401, response.HTTP_STATUS_CODES.unauthorized);
                        }
                    }); //closing of first query
            });
        });
    }

    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const id = user.data.id
                //update employee's details
                const updateDetails = await updateEmployee(id)
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

/**
 * Delete an employee
 */
module.exports.delete = (req, res, next) => {
    //function that deletes employee by id
    const deleteEmployee = (user_id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.beginTransaction(function (error) {
                if (error) {
                    response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                }
                connection.query(sql_query.SELECT_JOB_FUNCTION_BY_ID_QUERY,
                    [user_id], function (error, results, fields) {
                        if (error) {
                            return connection.rollback(function () {
                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                            });
                        }

                        if (results.length > 0) {
                            const job_function = results[0].job_function;

                            //check if the user is valid to execute the request by job function
                            if (job_function && globals.validRoles.includes(job_function)) {

                                const { id } = req.params
                                //delete employee
                                connection.query(sql_query.DELETE_BY_ID_QUERY,
                                    [id],
                                    async function (error, results, fields) {
                                        if (error) {
                                            return connection.rollback(function () {
                                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                            });
                                        }
                                        connection.commit(function (error) {
                                            if (error) {
                                                return connection.rollback(function () {
                                                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                                });
                                            }
                                            connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                                            //verify if the data is successfully inserted
                                            if (results && results.affectedRows > 0) {
                                                response.success(res, next, id, 200, response.HTTP_STATUS_CODES.ok, "Account successfully deleted!")
                                            } else {
                                                //not found
                                                response.failure(res, next, "Account not found!", 404, response.HTTP_STATUS_CODES.not_found);
                                            }
                                        });
                                    });
                            } else {
                                response.failure(res, next, "Current job function cannot perform this request", 401, response.HTTP_STATUS_CODES.unauthorized);
                            }
                        } else {
                            //not found
                            response.failure(res, next, "Account not found!", 404, response.HTTP_STATUS_CODES.not_found);
                        }
                    }); //closing of first query
            });
        });
    }

    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const id = user.data.id
                //delete an employee by id
                const del = await deleteEmployee(id)
            }

        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}

module.exports.logout = (req, res, next) => {
    const updateLoggedIn = (id) => {
        sql.getConnection(function (error, connection) {
            if (error) {
                return response.failure(res, next, error, 400, response.HTTP_STATUS_CODES.bad_request);
            }
            connection.beginTransaction(function (error) {
                if (error) {
                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                }

                //update
                connection.query(sql_query.LOGINANDOUT_QUERY,
                    [0, id],
                    async function (error, results, fields) {
                        if (error) {
                            return connection.rollback(function () {
                                return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                            });
                        }
                        connection.commit(function (error) {
                            if (error) {
                                return connection.rollback(function () {
                                    return response.failure(res, next, error.sqlMessage, 400, response.HTTP_STATUS_CODES.bad_request);
                                });
                            }
                            connection.release(); // as stated in the documentation of mysql npm, I have to release the connection after I'm done with it
                            //verify if the data is successfully inserted
                            if (results && results.changedRows > 0) {
                                response.success(res, next, "Logged out", 200, response.HTTP_STATUS_CODES.ok, "Logout Successful!")
                            } else {
                                //not found
                                response.failure(res, next, "Account already logged out!", 400, response.HTTP_STATUS_CODES.bad_request);
                            }
                        });
                    });
            });
        });
    }
    async function main() {
        try {
            //validate token
            const user = await validateRequest(req, res, next);
            if (user) {
                const id = user.data.id
                const update = await updateLoggedIn(id);
            }
        } catch (e) {
            response.failure(res, next, e, 400, response.HTTP_STATUS_CODES.bad_request);
        }
    }
    main();
}