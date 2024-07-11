import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"



const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId);
        
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        
        await user.save({ validateBeforeSave : false });
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) =>{
    //extract user details from req.body    
    const {fullName,email,username,password} = req.body;
    //check if data feilds are empty 
    if ([fullName,email,username,password].some((feild)=> feild?.trim() === "")) {
        throw new ApiError(400,"All feilds are required")
    }
    //check if user already exists
    const existingUser = await User.findOne({
        $or: [{ username },{ email }]
    });

    if (existingUser) {
        throw new ApiError(409,"User with Username or email already exists");
    }
    
    //get localFile path of avatar get localFile path of coverImage
    console.log(req.files)
   
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400," Avatar file is required ")
    }
    
    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    // check if properly uploaded
    if (!avatar) {
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "" ,
        email,
        username:username.toLowerCase(),
        password,
    })

    // check for user creation
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully ! ")
    )

})

const loginUser = asyncHandler(async (req,res) =>{
    const {email,username,password} = req.body;
    // console.log(req.body);
    // console.log(email,password);
    

    if(!( username || email )){
        throw new ApiError(400,"Username or email is required");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);
    // console.log(`Access toke from generate access and refresh token function  :: ${accessToken} and refresh token :: ${refreshToken}`);
    const loggedInUser = await User.findById(user._id).select(" -password -refreshToken");
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,
            accessToken,
            refreshToken
        },"User logged in successfully")
    )
});

const logOutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1  ,
            },
        },
        {
            new:true
        },

    )
    // console.log("res.user._id :: ",res.user._id);
    const options = {
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logged out")
    )

})


const refreshAccessToken = asyncHandler(async(req,res)=>{

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    
    try {
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh Token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is invalid or used");
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newRefreshToken, options)
          .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken,
                },
                "Access Token Refreshed"
            )
          );
    
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh Token")
    }
});


const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?._id)
    
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!oldPassword) {
        throw new ApiError(401,"Invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"New pasword set succesfully")
    )
});

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res
   .status(200)
   .json(
    new ApiResponse(200,user,"User fetched succesfully")
   )
});

const updateUserDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if(!(fullName&&email)){
        throw new ApiError(400,"All feilds are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath =await  req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400,"Error uploading on avatar");
    }

   
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },{
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file.path;
    if(!coverImageLocalPath){
        throw  new ApiError(400,"Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading Cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        }
        ,{
            new:true
        }
    ).select("-password")

     return res
       .status(200)
       .json(new ApiResponse(200, user, "Cover image updated successfully"));



})
// function below is mongodb aggregation pipeline - sde II 
const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const { username } = req.params;
    if(!username?.trim()){
        throw new ApiError(400,"username is required");
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedTo: {
            $size: "$subscribedTo",
          },
          isSubscribedTo: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribedTo.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount:1,
          channelsSubscribedTo:1,
          avatar: 1,
          coverImage: 1,
          isSubscribedTo: 1,
        },
      },
    ]);

    if(!channel?.length){
        throw new ApiError(404,"Channel not found");
    }
    console.log("channel :: ",channel[0]);

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User Channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully")
    )
})


export { 
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken ,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};