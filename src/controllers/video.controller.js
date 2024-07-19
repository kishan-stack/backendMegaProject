import mongoose from "mongoose";
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  
  const filter  = { };
  
  if(query){
   filter.$or = [
    { title: { $regex: query , $options: 'i' } },
    { description: { $regex: query , $options: 'i' } },
   ]
  }

  if (userId) {
    filter.owner = new mongoose.Types.ObjectId(userId)
  }

  const sort = { }; 

  if(sortBy){
    sort[sortBy] = sortType === 'desc' ? -1 : 1 ;
  }else{
    sort.createdAt = -1;
  }

  const options = {
     page: parseInt(page, 10),
     limit: parseInt(limit, 10),
     sort,
     customLabels:{
      totalDocs: 'totalDocs',
      docs: 'videos',
      limit: 'pageSize',
      page: 'currentPage',
      totalPages: 'totalPages',
      nextPage: 'nextPage',
      prevPage: 'prevPage',
      pagingCounter: 'pagingCounter',
      meta: 'pagination'
     },
  };

  try {
    const result = await Video.aggregatePaginate(
      Video.aggregate([
        { $match: filter },
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
          $sort: sort, // Add a sort key here
        },
        {
          $project: {
            videoFile: 1,
            title: 1,
            thumbnail: 1,
            description: 1,
            duration: 1,
            views: 1,
            isPublished: 1,
            createdAt: 1,
            updatedAt: 1,
            owner: 1,
            "ownerInfo.avatar": 1,
            "ownerInfo.username": 1,
          },
        },
      ]),
      options
    );


    if (!result) {
      throw new ApiResponse(200, "No Videos found !!");
    }
    
    
    return res
    .status(200)
    .json(
      new ApiResponse(200,result,"Videos fetched successfully")
    )
  } 
  catch (error) {
    res.status(500)
    .json(
      new ApiError(500,error.message|| "error while fetching videos from database")
    )
  }

});

const publishAVideo = asyncHandler(async (req, res) => {

  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
// get video, 
// get thumbnail
// check validation
// upload to cloudinary
// create video
// return video
const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

 if (!videoLocalPath) {
    throw new ApiError(400,"Video is required");
 }
 if (!thumbnailLocalPath) {
    throw new ApiError(400,"Thumbnail is required");
 }

 if (
   [title,description].some((feild) => feild?.trim() === "")
 ) {
   throw new ApiError(400, "All feilds are required");
 }

 const videoFromCloudinary = await uploadOnCloudinary(videoLocalPath);
 const thumbnailFromCloudinary = await uploadOnCloudinary(thumbnailLocalPath);

 if (!videoFromCloudinary) {
    throw new ApiError(500,"error while uploading video file to cloudinary");
 }
 if (!thumbnailFromCloudinary) {
    throw new ApiError(500,"error while uploading thumbnail file to cloudinary");
 }

 

 const video = await Video.create({
    title,
    description,
    videoFile:videoFromCloudinary.url,
    thumbnail:thumbnailFromCloudinary.url,
    owner:req.user._id,
    duration:videoFromCloudinary.duration,
 })
  const createdVideo = await Video.findById(video._id)
  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdVideo, "video uploaded successfully ! "));

});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,video,"video fetched successfully")
  )
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  //take input of title ,description and thumbnail
  //check validation
  //upload to cloudinary
  // delete previous thumbnail from cloudinary
  //update video
  if (!videoId) {
    throw new ApiError(400,"video not found")
  }

 
  const {title,description} = req.body;
  if (
    [title,description].some((feild) => feild?.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required");
  }


  const thumbnailLocalPath = req.file?.path;
  if(!thumbnailLocalPath){
    throw new ApiError(400,"Thumbnail is required");
  }

  const thumbnailFromCloudinary = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailFromCloudinary) {
    throw new ApiError(500,"error while uploading thumbnail file to cloudinary");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnailFromCloudinary.url,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,video,"video updated successfully")
  )

});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(400,"video not found")
  }


  const video = await Video.findByIdAndDelete(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,"video deleted successfully")
  )

});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400,"video not found")
  }

  

  // const video = await Video.findByIdAndUpdate(
  //   videoId,
  //   {
  //     $set: {
  //         isPublished: { $cond: [{ $eq: ['$isPublished', true] }, false, true] },
  //       }
  //   },
  //   { new: true }
  // );

  try {
    const video = await Video.findById(videoId)
    if (!video) {
      throw new ApiError(404, "Video not found");
    }
    video.isPublished = !video.isPublished;
    await video.save();

    return res
    .status(200)
    .json(
      new ApiResponse(200,video,"video status updated successfully")
    )
  } catch (error) {
    throw new ApiError("video not found from catch of try&catch")
  }

  


});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
