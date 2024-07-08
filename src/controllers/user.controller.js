import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


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
    res.json({message:"recieved"})
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0) {
    //     coverImageLocalPath = req.files.coverImage[0].path;
    // }


    // if (!avatarLocalPath) {
    //     throw new ApiError(400," Avatar file is required ")
    // }
    
    // //upload on cloudinary
    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    // //check if properly uploaded
    // if (!avatar) {
    //     throw new ApiError(400,"Avatar file is required");
    // }

    // const user = await User.create({
    //     fullName,
    //     avatar:avatar.url,
    //     coverImage:coverImage?.url || "" ,
    //     email,
    //     username:username.toLowerCase(),
    //     password,
    // })

    // //check for user creation
    // const createdUser = await User.findById(user._id).select("-password -refreshToken")
    // if (!createdUser) {
    //     throw new ApiError(500,"Something went wrong while registering the user");
    // }

    // return res.status(201).json(
    //     new ApiResponse(200,createdUser,"User registered successfully ! ")
    // )

})



export {
    registerUser,
}