import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle like on video
    try {
      const userId = req.user?._id
      if(!videoId){
        throw new ApiError(400, "Video information is required")
      }    
  
      const existingLikeOnVideo = await Like.findOneAndDelete({ video : videoId , likedBy : userId })
      if(existingLikeOnVideo){
        return res
        .status(200)
        .json(
          new ApiResponse(200,"like removed from video")
        )
      }
       
      const newLike = await Like.create({ video: videoId, likedBy: userId });
      if(!newLike){
        throw new ApiError(500 , "Unable to like video")
      }
  
      return res
      .status(200)
      .json(new ApiResponse(200,"like added to video"))
  
  
    } catch (error) {
      throw new ApiError(500,"Error :: ",error)
    }


});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  try {
    const userId = req.user?._id
    if(!commentId){
      throw new ApiError(400, "Comment information is required")
    }
  
    const existingLikeOnComment = await Like.findOneAndDelete({ comment : commentId , likedBy : userId})
    if(existingLikeOnComment){
      return res
      .status(200)
      .json(
        new ApiResponse(200,"Liked added to comment")
      )
    }
  
    const newLikeOnComment = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
  
    if(!newLikeOnComment){
      throw new ApiError(500 , "Unable to like comment")
    }
  
    return res
    .status(200)
    .json(
      new ApiResponse(200,"Liked added to comment")
    )
  } catch (error) {
    throw new ApiError(500,"Error :: ",error)
  }

});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  try {
    const userId = req.user?._id
    if (!tweetId) {
      throw new ApiError(400,"tweet information not provided")
    }
  
    const existingLikeOnTweet = await Like.findOneAndDelete({ tweet: tweetId , likedBy :  userId });
    if (existingLikeOnTweet) {
      return res
      .status(200)
      .json(
        new ApiResponse(200,"Liked added to tweet")
      )
    }
  
    const newLikeOnTweet = await Like.create({ tweet : tweetId , likedBy: userId})
    if (!newLikeOnTweet) {
      throw new ApiError(500 , "Unable to like tweet")
    }
  
    return res
    .status(200)
    .json(
      new ApiResponse(200,"like added to tweet ")
    )
  } catch (error) {
    throw new ApiError(500,"Error :: ",error)
  }

});


const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
    try {
      const userId = req.user?._id;
      const likedVideos = await Like.aggregate([
          {
            $match: {
              likedBy: new mongoose.Types.ObjectId(userId)
            },
          },
          {
            $lookup: {
              from: "videos",
              localField: "video",
              foreignField: "_id",
              as: "likedVideos",
            },
          },
          {
            $unwind: "$likedVideos",
          },
          {
            $lookup: {
              from: "users",
              localField: "likedVideos.owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: {
              path: "$ownerDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: null,
              likedVideos: {
                $push: {
                  thumnail: "$likedVideos.thumbnail",
                  title: "$likedVideos.title",
                  duration: "$likedVideos.duration",
                  views: "$likedVideos.views",
                  owner: {
                    username: "$ownerDetails.username",
                    fullName: "$ownerDetails.fullName",
                    avatar: "$ownerDetails.avatar",
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        
      ]);
  
      if (!likedVideos) {
        throw new ApiError(500,"error fetching liked videos")
      }
  
      return res
      .status(200)
      .json(new ApiResponse(200,likedVideos,"Liked videos fetched successfully"))
  
    } catch (error) {
      throw new ApiError(500,"Error :: ",error)
    }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
