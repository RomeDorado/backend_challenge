# Backend Challenge

### Endpoints available:

```
/api/auth
/api/create
/api/employee/:id
/api/manager/employee
/api/search
/api/update/:id
/api/delete/:id
/api/logout
```

### /api/auth
A token is generated after logging in. The returned token is a Bearer Token to be used for authentication as you request through other endpoints.

### /api/create
A bearer token is required to access this endpoint. Only the Manager (and CEO, I gave the CEO account the same rights with the Manager since CEO's rights was not mentioned in the document. Same goes for other endpoints) can create accounts. I've also included user input validations/restrictions on formats

### /api/employee/:id
A bearer token is required to access this endpoint. Used to get employee by ID

### /api/manager/employee
A bearer token is required to access this endpoint. Used to get the employees of the logged in manager

### /api/search
A bearer token is required to access this endpoint. Used to get the employees by searching for job function

### /api/update/:id
A bearer token is required to access this endpoint. Only the Manager can update an employee by ID and is restricted to make password & personal email updates. Password & personal email updates are only permitted if it is for the logged in Manager. I've also included user input validations/restrictions on formats

### /api/delete/:id
A bearer token is required to access this endpoint. Only the Manager can delete an employee by ID

### /api/logout
A bearer token is required to access this endpoint. Logs out the logged in user