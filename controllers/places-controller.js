const HttpError = require("../models/http-error");

const placeClass = require("../models/place");

const { validationResult } = require("express-validator");

const mongoose = require("mongoose");

const userClass = require("../models/user");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await placeClass.findById(placeId);
  } catch (err) {
    const error = new HttpError("SOMETHING WENT WRONG", 500);
    return next(error);
  }

  if (!place) {
    return next(new HttpError("could not find a place with provided id", 404));
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const creatorId = req.params.uid;
  let userWithplaces;
  try {
    userWithplaces = await userClass.findById(creatorId).populate("places");
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  if (!userWithplaces) {
    return next(
      new HttpError("could not find a place with provided user id", 404)
    );
  }
  res.json({
    places: userWithplaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError("Invalid input passed, Please check your data", 442)
    );
  }
  const { title, description, address, location, creator } = req.body;
  const createdPlace = new placeClass({
    title,
    description,
    image: req.file.path,
    address,
    location: JSON.parse(location),
    creator,
  });
  let user;

  try {
    user = await userClass.findById(creator);
  } catch (err) {
    const error = new HttpError("Something went wrong in finding user id", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find the provided user id", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess, validateModifiedOnly: true });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("insertion failed", 500));
  }
  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new HttpError(
      "Invalid input passed, Please check your data",
      442
    );
    return next(error);
  }
  const { title, description, address } = req.body;
  let place;
  try {
    place = await placeClass.findById(req.params.pid);
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "you are not allowed to edit other user place",
      401
    );
    return next(error);
  }

  place.title = title;
  place.description = description;
  place.address = address;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await placeClass.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError("something went wrong", 500);
    return next(error);
  }

  if (place.creator.toObject({ getters: true }).id !== req.userData.userId) {
    const error = new HttpError(
      "you are not allowed to delete other user place",
      401
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "we could find place with provided place id",
      404
    );
    return next(error);
  }

  const placePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess, validateModifiedOnly: true });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }

  fs.unlink(placePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "place deleted" });
};

exports.getPlaceById = getPlaceById;

exports.getPlacesByUserId = getPlacesByUserId;

exports.createPlace = createPlace;

exports.updatePlace = updatePlace;

exports.deletePlace = deletePlace;
