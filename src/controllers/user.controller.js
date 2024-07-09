import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {upload } from "../middlewares/multer.middleware.js"
const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId);
        
        const refreshToken = user.generateAccessToken();
        const accessToken = user.generateRefreshToken();

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
    console.log(req.body);
    console.log(email,password);
    

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

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

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

export {
    registerUser,
    loginUser,
    logOutUser
}