const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; // 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication Failed !");
    }
    const decodedToken = jwt.verify(token, "supersecret_dont_share");
    req.userData = { userId: decodedToken.userId };
    return next();
  } catch (err) {
    const error = new HttpError("Authentication Failed", 401);
    return next(error);
  }
};
