const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const UserClass = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await UserClass.find({}, "-password"); // doubt
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signUp = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError("Invalid input data, please check your data", 442)
    );
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await UserClass.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  if (existingUser) {
    return next(
      new HttpError("Email already taken, try again with different email", 404)
    );
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 14); // 12 is minimum
  } catch (err) {
    const error = new HttpError(
      "could able to create a user, please try again",
      500
    );
    return next(error);
  }

  const createdUser = new UserClass({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Creating new User Failed",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Creating new User Failed",
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await UserClass.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("login failed , please try again", 500);
    return next(error);
  }
  if (!existingUser) {
    const error = new HttpError(
      "invalid credentials , please enter valid data",
      401
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "could not logged you in, please try again",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "invalid credentials , please enter valid data",
      401
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Something went wrong, login Failed", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
  // res.json({meassge:"logged in",existingUser:existingUser.toObject({getters:true})});
};

exports.getUsers = getUsers;

exports.signUp = signUp;

exports.login = login;
