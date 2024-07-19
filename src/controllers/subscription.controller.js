import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?._id;

    try {
    const existinguser = await Subscription.findOneAndDelete({
    subscriber: userId,
    channel: channelId,
    });

    if (existinguser) {
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription removed successfully"));
    }


    const newUser = await Subscription.create({
    subscriber: userId,
    channel: channelId,
    });

    if(!newUser) throw new ApiError(500,"Unable to add subscription");

    return res
    .status(200)
    .json(
      new ApiResponse(200,"Subscription added")
    )
    } catch (error) {
    throw new ApiError("Error :: ",error)
    }

});
// controller to return subscriber list of a channel


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;
    // Fetch the subscriber list for the given channel
    const subscribers = await Subscription.aggregate([
      [
        {
          $match: {
            channel: new mongoose.Types.ObjectId(channelId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "subscriber",
            foreignField: "_id",
            as: "subscribers",
          },
        },
        {
          $unwind: "$subscribers", // Unwind to flatten the array
        },
        {
          $group: {
            _id: null, // Grouping all documents into one
            subscribers: {
              $push: {
                username: "$subscribers.username",
                email: "$subscribers.email",
                fullName: "$subscribers.fullName",
              },
            }, // Push only the specified fields into a single array
          },
        },
        {
          $project: {
            _id: 0,
            subscribers: 1,
          },
        },
      ],
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "user subscribers fetched successfully"
        )
      );
  } catch (error) {
    return res
    .status(500)
    .json(new ApiError(500,"Error fetching subscribers"))
  }
});





// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  
  try{
  
  const subscriptions = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId), // Match the subscriber ID
        },
      },
      {
        $lookup: {
          from: "users", // Join with the users collection
          localField: "channel", // Field from Subscription
          foreignField: "_id", // Field from User
          as: "channels", // Output array field
        },
      },
      {
        $unwind: "$channels", // Flatten the channels array
      },
      {
        $group: {
          _id: null, // Grouping all documents into one
          channels: {
            $push: {
              _id: "$channels._id",
              username: "$channels.username",
              email: "$channels.email",
              fullName: "$channels.fullName",
              avatar: "$channels.avatar",
            },
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field from the output
           // Include the channels array
        },
      },
    ]);

    // If no subscriptions found, return an empty array
    if (!subscriptions.length) {
      return res.status(200).json(new ApiResponse(200,{ channels: [] },"channels fetched successfully"));
    }

    res.status(200).json(new ApiResponse(200,subscriptions[0],"channels fetched successfully")); // Return the first (and only) document
  } catch (error) {
    console.error("Error fetching subscribed channels:", error);
    res.status(500).json({ message: "Internal server error" });
  }

});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
