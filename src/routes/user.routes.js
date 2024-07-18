import { Router } from "express";
import {changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logOutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage, updateUserDetails, addVideoToWatchHistory} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
            {
                name:"avatar",
                maxCount:1,
            },
            {
                name:"coverImage",
                maxCount:1,
            },
        ]),
    registerUser
)
router.route("/login").post(upload.any(), loginUser);

//secured Routes
router.route("/logout").post(verifyJWT,logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-user").patch(verifyJWT,updateUserDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/channels/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory).post(verifyJWT,addVideoToWatchHistory)


export default router;