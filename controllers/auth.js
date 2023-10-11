const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const {nanoid} = require("nanoid");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { BASE_URL } = process.env;

const verificationToken= nanoid();

const { User } = require("../models/user");

const { HttpError, ctrlWrapper, nodemailerConfig } = require("../helpers");

const transport = nodemailer.createTransport(nodemailerConfig);

const path = require("path");
const fs = require("fs/promises");
const jimp = require("jimp");

const avatarsDir = path.join(__dirname, "../", "public", "avatars");


const { SECRET_KEY } = process.env;

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);
 

  const newUser = await User.create({ ...req.body, password: hashPassword, avatarURL, verificationToken});

  const verifyEmail = {
    to: email,
    from: "denys.kovtun@meta.ua",
    subject: "Verify email",
    html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationToken}">Click verify email</a>`,
  };

  transport
    .sendMail(verifyEmail)
    .then(() => console.log("Email send success"))
    .catch(error => console.log(error.message));

  res.status(201).json({
    email: newUser.email,
    subscription: newUser.subscription,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }
  if (!user.verify) {
    throw HttpError(401, "Email not verified");
  }
  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, "Email or password is wrong");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });

  res.status(200).json({
    token,
    user: {
      email: user.email,
      subscription: user.subscription,
    },
  });
};

const getCurrent = async (req, res) => {
  const { email, subscription } = req.user;

  res.status(200).json({
    email,
    subscription,
  });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.status(204).json({
    message: "Logout success",
  });
};

const updateUserSubscription = async (req, res) => {
  const { _id: userId } = req.user;
  const { subscription } = req.body;

  const allowedSubscriptions = ["starter", "pro", "business"];
  if (!allowedSubscriptions.includes(subscription)) {
    throw HttpError(400, "Invalid subscription value");
  }

  const updatedUser = await User.findByIdAndUpdate(userId, { subscription }, { new: true });

  if (!updatedUser) {
    throw HttpError(404, "User not found");
  }

  res.json(updatedUser);
};

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: tempUpload, originalname } = req.file;
  const filename = `${_id}_${originalname}`;
  const resultUpload = path.join(avatarsDir, filename);
  const img = await jimp.read(tempUpload);
  await img
    .autocrop()
    .cover(250, 250, jimp.HORIZONTAL_ALIGN_CENTER || jimp.VERTICAL_ALIGN_MIDDLE)
    .writeAsync(tempUpload);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", filename);
  await User.findByIdAndUpdate(_id, { avatarURL });

  res.json({
    avatarURL,
  });
};


const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });

  if (!user) {
    throw HttpError(404, "User not found");
  }
  await User.findByIdAndUpdate(user._id, { verify: true, verificationToken: null });

  res.status(200).json({
    message: "Verification successful",
  });
};


const resendVerifyEmail = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(404, "User not found");
  }
  if (user.verify) {
    throw HttpError(400, "Verification has already been passed");
  }

  const verifyEmail = {
    to: email,
    from: "denys.kovtun@meta.ua",
    subject: "Verify email",
    html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${user.verificationToken}">Click verify email</a>`,
  };

  transport
    .sendMail(verifyEmail)
    .then(() => console.log("Email send success"))
    .catch(error => console.log(error.message));

  res.status(200).json({
    message: "Verification email sent",
  });
};




module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateUserSubscription: ctrlWrapper(updateUserSubscription),
  updateAvatar: ctrlWrapper(updateAvatar),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
};