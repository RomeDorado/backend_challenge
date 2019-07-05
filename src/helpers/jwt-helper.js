const jwt = require("jsonwebtoken");
const _ = require("underscore");

module.exports.generateToken = data => {

    var token = jwt.sign(
        {
            data: _.omit(data, ["password"]),
            expireIn: '1d'
        },
        process.env.JWT_SECRET
    );

    return signSuccess(token);
};

module.exports.validateToken = token => {
    return new Promise((resolve, reject) => {
        if (token && token.startsWith('Bearer ')) {
            //Get the token and remove the bearer from string
            token = token.split("Bearer ")[1];
        } else {
            reject(false)
        }
        //returns decoded token's data
        jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
            if (err) {
                reject(false)
            } else {
                resolve(decode)
            }
        });
    }).catch(e => e)
};

module.exports.decodeToken = token => {
    try {
        if (token) {
            var verified = jwt.verify(token, process.env.JWT_SECRET);
            if (verified) {
                return jwt.decode(token);
            } else {
                return false;
            }
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};

//Results with token
const signSuccess = (token) => {
    var results = {
        token: token
    };
    return results;
};
