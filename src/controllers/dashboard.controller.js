import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Assuming the user ID is available in req.user

  const channelStats = await User.aggregate([
    {
      $match: {
        _id: userId, // Match the user whose channel stats are being retrieved
      },
    },
    {
      $lookup: {
        from: "videos", // Join with the videos collection
        localField: "_id", // Field in the users collection
        foreignField: "owner", // Field in the videos collection
        as: "videos", // Output array field for videos
      },
    },
    {
      $lookup: {
        from: "likes", // Join with the likes collection
        localField: "videos._id", // Field in the videos collection
        foreignField: "video", // Field in the likes collection
        as: "likes", // Output array field for likes
      },
    },
    {
      $project: {
        _id: 0,
        totalVideos: { $size: "$videos" }, // Get the total number of videos
        totalViews: { $sum: "$videos.views" }, // Calculate the total video views
        totalLikes: { $size: "$likes" }, // Get the total number of likes
        totalSubscribers: "$subscribers", // Get the total number of subscribers
      },
    },
  ]);

  if (!channelStats || channelStats.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelStats[0],
        "Channel stats retrieved successfully"
      )
    );
});


const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Assuming the user ID is available in req.user

  const channelVideos = await User.aggregate([
    {
      $match: {
        _id: userId, // Match the user whose channel videos are being retrieved
      },
    },
    {
      $lookup: {
        from: "videos", // Join with the videos collection
        localField: "_id", // Field in the users collection
        foreignField: "owner", // Field in the videos collection
        as: "videos", // Output array field for videos
      },
    },
    {
      $unwind: {
        path: "$videos", // Unwind the videos array to get individual video documents
        preserveNullAndEmptyArrays: true, // Optional: if you want to keep users without videos
      },
    },
    {
      $project: {
        _id: 0,
        thumbnail: "$videos.thumbnail",
        title: "$videos.title",
        description: "$videos.description",
        duration: "$videos.duration",
        views: "$videos.views",
        isPublished: "$videos.isPublished",
        createdAt: "$videos.createdAt",
        updatedAt: "$videos.updatedAt",
      },
    },
  ]);

  if (!channelVideos || channelVideos.length === 0) {
    throw new ApiError(404, "Channel not found or no videos found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelVideos,
        "Channel videos retrieved successfully"
      )
    );
});


export { getChannelStats, getChannelVideos };
