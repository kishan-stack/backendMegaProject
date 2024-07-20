import mongoose, { set } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

  const results = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        _id: 0,
        content: 1,
        username: "$ownerDetails.username",
        avatar : "$ownerDetails.avatar"
      },
    },
    {
      $facet: {
        comments: [
          { $skip: skip }, // Skip the calculated number of documents
          { $limit: limit }, // Limit the number of documents returned
        ],
        totalCount: [
          { $count: "count" }, // Count the total number of comments for the video
        ],
      },
    },
    {
      $project: {
        comments: 1,
        totalCount: { $arrayElemAt: ["$totalCount.count", 0] }, // Extract the count from the array
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200,results[0],"comments fetched successfully")) // Return the first element which contains comments and totalCount





});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
    try {
        const {videoId} = req.params;
        const userId = req.user?._id;
        const { comment } = req.body;
    
    
        if (!comment) {
            throw new ApiError(400,"comment feild is required")
        }
        if (!videoId) {
            throw new ApiError(400,"Video information not provided");
        }
    
        const createdComment = await Comment.create({
            content: comment,
            video: videoId,
            owner:userId
        })
    
        if (!createdComment) {
            throw new ApiError(500,"error while posting comment")
        }
    
        return res
        .status(201)
        .json(
            new ApiResponse(201, "Comment posted successfully")
        )
    
    } catch (error) {
        throw new ApiError(500,"Error :: ",error)
    }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId} = req.params;
  const { comment } = req.body;

  const userId = req.user?._id


  const existingComment = await Comment.findOne({ _id: commentId , owner : userId})
  if (!existingComment) {
    throw new ApiError(404, "Comment not found")
  }

  const updatedComment = await Comment.findByIdAndUpdate(existingComment._id,
    {
      $set:{
        content: comment,

      }
    },{
      new:true
    }
  )

  if (!updatedComment) {
    throw new ApiError(500,"Error while updating comment");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,"Comment updated successfully")
  )

});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId} = req.params;
  const userId = req.user?._id

 const existingComment = await Comment.findOne({
   _id: commentId,
   owner: userId,
 });
 if (!existingComment) {
   throw new ApiError(404, "Comment not found");
 }

 const deletedComment = Comment.findByIdAndDelete(existingComment._id)
 if (!deletedComment) {
  throw new ApiError(500, "Error while deleting comment");
 }

 return res.status(200).json(new ApiResponse(200,"Comment deleted successfully"))



});

export { getVideoComments, addComment, updateComment, deleteComment };
