import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const owner = req.user?._id

    if (!name||!description) {
        throw new ApiError(400,"All feild are required")
    }
    //TODO: create playlist
    const playList = await Playlist.create({ name , description , owner })
    if (!playList) {
        throw new ApiError(500,"Error while creating playlist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,playList,"playlist created successfully")
    )


});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) {
    throw new ApiError(400,"UserId not provided");
  }
const playlists = await Playlist.aggregate(
  [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId), // Match playlists owned by the specified user
      },
    },
    {
      $lookup: {
        from: "users", // Assuming your users collection is named "users"
        localField: "owner", // Field in the playlists collection
        foreignField: "_id", // Field in the users collection
        as: "ownerDetails", // Output array field
      },
    },
    {
      $unwind: {
        path: "$ownerDetails", // Unwind to get a single object instead of an array
        preserveNullAndEmptyArrays: true, // Optional: if you want to keep playlists without owners
      },
    },
    {
      $lookup: {
        from: "videos", // Join with the videos collection
        localField: "videos", // Field in the playlists collection
        foreignField: "_id", // Field in the videos collection
        as: "videos", // Output array field
      },
    },
    {
      $unwind: {
        path: "$videos", // Unwind to get individual video documents
        preserveNullAndEmptyArrays: true, // Optional: if you want to keep playlists without videos
      },
    },
    {
      $lookup: {
        from: "users", // Join with the users collection again for video owners
        localField: "videos.owner", // Field in the videos collection
        foreignField: "_id", // Field in the users collection
        as: "videoOwnerDetails", // Output array field for video owners
      },
    },
    {
      $unwind: {
        path: "$videoOwnerDetails",
        preserveNullAndEmptyArrays: true, // Optional: if you want to keep videos without owners
      },
    },
    {
      $group: {
        _id: "$_id", // Group by playlist ID to aggregate video details
        name: { $first: "$name" }, // Use $first to get the playlist name
        description: { $first: "$description" }, // Use $first to get the playlist description
        owner: { $first: "$ownerDetails.username" }, // Get the owner's username
        videos: {
          $push: {
            // Use $push to create an array of video details
            thumbnail: "$videos.thumbnail", // Directly take the thumbnail
            title: "$videos.title", // Directly take the title
            duration: "$videos.duration", // Directly take the duration
            owner: "$videoOwnerDetails.username", // Include video owner username
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: 1, // Include playlist name
        description: 1, // Include playlist description
        owner: 1, // Include owner username
        videos: 1, // Include the array of video details
      },
    },
  
]);

    if (!playlists) {
        throw new ApiError(500,"Error while fetching playlist ")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,playlists,"Successfully fetched playlists"))

});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId) {
        throw new ApiError(400,"Playlist information not supplied")
    }
    //TODO: get playlist by id
    const playlists = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId), // Match playlists owned by the specified user
        },
      },
      {
        $lookup: {
          from: "users", // Assuming your users collection is named "users"
          localField: "owner", // Field in the playlists collection
          foreignField: "_id", // Field in the users collection
          as: "ownerDetails", // Output array field
        },
      },
      {
        $unwind: {
          path: "$ownerDetails", // Unwind to get a single object instead of an array
          preserveNullAndEmptyArrays: true, // Optional: if you want to keep playlists without owners
        },
      },
      {
        $lookup: {
          from: "videos", // Join with the videos collection
          localField: "videos", // Field in the playlists collection
          foreignField: "_id", // Field in the videos collection
          as: "videos", // Output array field
        },
      },
      {
        $unwind: {
          path: "$videos", // Unwind to get individual video documents
          preserveNullAndEmptyArrays: true, // Optional: if you want to keep playlists without videos
        },
      },
      {
        $lookup: {
          from: "users", // Join with the users collection again for video owners
          localField: "videos.owner", // Field in the videos collection
          foreignField: "_id", // Field in the users collection
          as: "videoOwnerDetails", // Output array field for video owners
        },
      },
      {
        $unwind: {
          path: "$videoOwnerDetails",
          preserveNullAndEmptyArrays: true, // Optional: if you want to keep videos without owners
        },
      },
      {
        $group: {
          _id: "$_id", // Group by playlist ID to aggregate video details
          name: { $first: "$name" }, // Use $first to get the playlist name
          description: { $first: "$description" }, // Use $first to get the playlist description
          owner: { $first: "$ownerDetails.username" }, // Get the owner's username
          videos: {
            $push: {
              // Use $push to create an array of video details
              thumbnail: "$videos.thumbnail", // Directly take the thumbnail
              title: "$videos.title", // Directly take the title
              duration: "$videos.duration", // Directly take the duration
              owner: "$videoOwnerDetails.username", // Include video owner username
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: 1, // Include playlist name
          description: 1, // Include playlist description
          owner: 1, // Include owner username
          videos: 1, // Include the array of video details
        },
      },
    ]);

    
    if (!playlists) {
      throw new ApiError(500, "Error while fetching playlist ");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlists, "Successfully fetched playlists"));

    


});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id;

    const existingPlaylist = await Playlist.findOne({ _id : playlistId , owner : userId});
    if(!existingPlaylist){
        throw new ApiError(400,"Unauthorized request")
    }

    const addVideoInPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $addToSet: { videos: videoId },
      },
      {
        new: true,
      }
    );

    if(!addVideoInPlaylist){
        throw new ApiError(500,"Error while adding video to playlist ")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,addVideoInPlaylist," Video addded to playlist "))


});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
const userId = req.user?._id;

const existingPlaylist = await Playlist.findOne({
  _id: playlistId,
  owner: userId,
});
if (!existingPlaylist) {
  throw new ApiError(400, "Unauthorized request");
}

const removeVideo = await Playlist.findByIdAndUpdate(
  playlistId,
  {
   $pull:{ videos : new mongoose.Types.ObjectId(videoId)}
  },
  {
    new: true,
  }
);

if (!removeVideo) {
  throw new ApiError(500, "Error while removing video to playlist ");
}

return res
  .status(200)
  .json(new ApiResponse(200, removeVideo, " Video removing to playlist "));



});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
    const userId = req.user?._id;

    const existingPlaylist = await Playlist.findOne({
        _id: playlistId,
        owner: userId,
    });

    if (!existingPlaylist) {
        throw new ApiError(400, "Unauthorized request");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(new mongoose.Types.ObjectId(playlistId));

    if (!deletedPlaylist) {
        throw new ApiError(500,"error while deleting playlist ")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,deletedPlaylist,"playlist deleted successfully"))


});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
    const userId = req.user?._id;
    const existingPlaylist = await Playlist.findOne({
        _id: playlistId,
        owner: userId,
    })
    if (!existingPlaylist) {
        throw new ApiError(400, "Unauthorized request");
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set:{
                name,
                description,
            }
        }
    );
    if (!updatedPlaylist) {
        throw new ApiError(500,"error while updating playlist ")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,updatedPlaylist,"playlist updated successfully"))



});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
