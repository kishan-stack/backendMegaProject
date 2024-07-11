import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

      // console.log(req.cookies)
    // console.log("token from request :: ",token);
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log("decodedTokenFromJWT :: ",decodedToken);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    ); 

    // console.log("userFromDB :: ",user);
    
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    // console.log("req.user._id ::",req.user._id)
    // console.log("req.user :: ",req.user)
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
