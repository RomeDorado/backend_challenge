module.exports = {
    LOGIN_QUERY: `SELECT
                        id,
                        corporate_email,
                        personal_email,
                        password
                    FROM
                        employees
                    WHERE                        
                        corporate_email = ?`,
    CREATE_TABLE_QUERY: `CREATE TABLE IF NOT EXISTS employees(
                        id INT NOT NULL AUTO_INCREMENT,
                        first_name VARCHAR(255) NOT NULL,
                        last_name VARCHAR(255) NOT NULL,
                        corporate_email VARCHAR(255) NOT NULL UNIQUE,
                        personal_email VARCHAR(255) NOT NULL UNIQUE,
                        birthdate DATE NOT NULL,
                        job_function VARCHAR(10) CHECK
                            (
                                job_function IN('CEO', 'Manager', 'Employee')
                            ),
                            manager INT,
                            password CHAR(60) NOT NULL,
                            loggedin TINYINT(1) DEFAULT 0,
                            PRIMARY KEY(id)
                    )`,
    INSERT_QUERY: `INSERT INTO employees
                    SET
                        id = ?,
                        first_name = ?,
                        last_name = ?,
                        corporate_email = ?,
                        personal_email = ?,
                        birthdate = ?,
                        job_function = ?,
                        manager = ?,
                        password = ?,
                        loggedin = ?`,
    SELECT_BY_ID_QUERY: `SELECT
                             *
                         FROM
                             employees
                         WHERE
                             id = ?`,
    SELECT_BY_NANAGER_ID_QUERY: `SELECT
                                    id,
                                    first_name,
                                    last_name,
                                    corporate_email,
                                    personal_email,
                                    birthdate,
                                    job_function,
                                    manager,
                                    loggedin
                                FROM
                                    employees
                                WHERE
                                    manager = ?`,
    SEARCH_BY_JOB_FUNCTION_QUERY: `SELECT
                                       id,
                                       first_name,
                                       last_name,
                                       corporate_email,
                                       personal_email,
                                       birthdate,
                                       job_function,
                                       manager,
                                       loggedin
                                   FROM
                                       employees
                                   WHERE
                                       job_function LIKE ?`,
    SELECT_JOB_FUNCTION_BY_ID_QUERY: `SELECT
                                          job_function
                                      FROM
                                          employees
                                      WHERE
                                          id = ?`,
    DELETE_BY_ID_QUERY: `DELETE
                         FROM
                             employees
                         WHERE
                             id = ?`,
    LOGINANDOUT_QUERY: `UPDATE
                       employees
                   SET
                       loggedin = ?
                   WHERE
                       id = ?`
}