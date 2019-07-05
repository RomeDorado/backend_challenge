const _ = require("underscore");
const sendResponse = (res, next, status, data, http_code, status_code, message) => {
  const response = {
    success: status,
    message,
    status: status_code,
    data: data
  };

  res.setHeader("content-type", "application/json");
  res.writeHead(http_code);
  res.end(JSON.stringify(response));
};

module.exports.success = (res, next, data, http_code, status_code, message) => {
  //--Filter result w/o password
  if (data.password) {
    data = _.omit(data, ["password"]);
  }

  sendResponse(res, next, true, data, http_code, status_code, message);
};

module.exports.failure = (res, next, data, http_code, status_code, message) => {
  sendResponse(res, next, false, data, http_code, status_code, message);
};

module.exports.HTTP_STATUS_CODES = {
  internal_server_error: "Internal Server Error" /**500 */,
  bad_gateway: "Service Unavai­lable" /**502 */,
  gateway_timeout: "Gateway Timeout" /**504 */,
  bad_request: "Bad Request" /**400 */,
  unauthorized: "Unauthorized" /**401 */,
  payment_required: "Payment Required" /**402 */,
  forbidden: "Forbidden" /**403 */,
  not_found: "Not Found" /**404 */,
  method_not_allowed: "Method Not Allowed" /**405 */,
  request_timeout: "Request Timeout" /**408 */,
  conflict: "Conflict" /**409 */,
  ok: "OK" /**200 */,
  created: "Created" /**201 */,
  accepted: "Accepted" /**202 */
};
