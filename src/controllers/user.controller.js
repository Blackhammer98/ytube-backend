import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {


   try {
     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken =  user.generateRefreshToken()
     
     user.refreshToken = refreshToken
     await user.save({ validateBeforeSave : false })

     return {refreshToken , accessToken}

   } catch (error) {
    throw new ApiError(500 , "Something went wrong while generating refresh and access token")
   }
}

const registerUser =  asyncHandler( async (req ,res) => {
 //get user's details from frontend
 //validations - not empty, min-length
 // check if user already exist : username and email
 //check for images and check for avatar
 //upload them to cloudinary , avatar
 //create  user object - create entry in  db
 //remove password and refresh token field form response
 // check for user creation
 //return res
 const { fullName , email , userName , password }= req.body
//  console.log("email : " , email);
//  console.log("userName : " , userName);
 
 if(
    [fullName , email , userName , password].some((fields) => fields?.trim() === "")
 ) {
    throw new ApiError (400 , "All fields are required !!")
 }

 const existedUser = await  User.findOne({
    $or : [{ userName },{ email }]
 })

 if(existedUser) {
    throw new ApiError(409 , "User with email or username already exist!!")
 }
//  console.log(req.files);
 
 
 const avatarLocalPath = req.files?.avatar[0]?.path;
//  const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;

if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
}

 if (!avatarLocalPath) {
    throw new ApiError (400 , "Avatar file is required")
 }

const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if (!avatar) {
 throw new ApiError (400 , "Avatar file is required")
}

const user = await User.create({
    fullName,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    userName : userName.toLowerCase()
});

const createdUser  = await User.findById(user._id).select(
    "-password -refreshToken"
)
if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user !")
}

return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
)

})

const  loginUser = asyncHandler( async (req ,res) => {
  //req body -> data
  //username or email
  //find the user in database
  //password check
  //access and refresh token generate
  //send cookie

  const {email , userName , password} = req.body

  if(!(email && userName)) {
    throw new ApiError(400 , "username or password is required")
  }

const user =  await User.findOne({
    $or: [{userName} ,{email}]
  })

  if(!user) {
    throw new ApiError(404 , "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid) {
    throw new ApiError(401 , "Invalid user credentials");
  }

 const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

 const options = {
    httpOnly: true,
    secure: true
 }
 return res
 .status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refreshToken, options)
 .json(
    new ApiResponse(
        200,
        {
            user: loggedInUser , accessToken , refreshToken
        },
        "User logged In successfully"
    )
 )
})

const logoutUser = asyncHandler(async(req, res) => {
 await  User.findByIdAndUpdate(
    req.user._id,
     {
       $set: {
        refreshToken: undefined
       }
    },
       {
        new: true
       }
    
   )

    const options = {
    httpOnly: true,
    secure: true
 }
  
 return res
 .status(200)
 .clearCookie("accessToken", options)
 .clearCookie("refreshToken", options)
 .json(new ApiResponse(200,{},"User Logged Out"))

})

export {
    registerUser,
    loginUser,
    logoutUser
}