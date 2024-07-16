import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
    const { content } = req.body;
    if (!content) {
        throw new ApiError(400,"tweet content is missing buddy");
    }

    const tweet = await Tweet.create({
        owner:req.user._id,
        content
    });

    if (!tweet) {
        throw new ApiError(500,"error in posting a tweet");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet creation successfull")
    )

});

const getUserTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.params.userId;

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    customLabels: {
      totalDocs: "totalResults",
      docs: "tweets",
      limit: "pageSize",
      page: "currentPage",
      totalPages: "totalPages",
      nextPage: "nextPage",
      prevPage: "prevPage",
      pagingCounter: "pagingCounter",
      meta: "pagination",
    },
  };

  try {
    const result = await Tweet.aggregatePaginate(
      Tweet.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        {
          $unwind: {
            path: "$ownerInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            content: 1,
            createdAt: 1,
            updatedAt: 1,
            owner: 1,
            "ownerInfo.fullName": 1,
            "ownerInfo.avatar": 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]),
      options
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Tweets fetched successfully"));
  } catch (error) {
    console.log("Error while fetching tweets: ", error);
    res
      .status(500)
      .json(
        new ApiError(
          500,
          error.message || "error while fetching tweets from database"
        )
      );
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;
    
    if(!content){
        throw new ApiError(400,"Information to be updated missing");
    }
    
    if(!tweetId){
        throw new ApiError(400,"Tweet information  is required");
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    );

    if(!tweet){
        throw new ApiError(404,"Tweet not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet updated successfully")
    )

});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
    const { tweetId } = req.params;
    
   if (!tweetId) {
     throw new ApiError(400, "Tweet information  is required");
   }
    
    const tweet = await Tweet.findByIdAndDelete(tweetId);
    
    if(!tweet){
        throw new ApiError(404,"Tweet not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"Tweet deleted successfully")
    )

});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
