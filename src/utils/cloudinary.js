import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully

    //  console.log("file is uploaded on cloudinary" , response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};
// fetch and save the oldAvatar url from req.user by Id
const deleteFromCloudinary = async (oldAvatarUrl) => {
  if (!oldAvatarUrl) {
    console.log("No old avatar URL provided for deletion. Skipping.");
    return false;
  }

  try {
    const urlParts = oldAvatarUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");

    if (uploadIndex === -1 || uploadIndex + 1 >= urlParts.length) {
      console.warn("Invalid Cloudinary URL format for deletion:", oldAvatarUrl);
      return false; // Not a valid Cloudinary URL to extract public ID
    }

    // Get the part of the URL after '/upload/' and before the file extension
    const publicIdWithExtension = urlParts.slice(uploadIndex + 1).join("/");
    const publicId = publicIdWithExtension.split(".")[0]; // Remove file extension

    console.log(
      `Attempting to delete Cloudinary image with public ID: "${publicId}"`
    );

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`Successfully deleted old avatar: "${oldAvatarUrl}"`);
      return true;
    } else {
      console.error(
        `Failed to delete old avatar from Cloudinary (public ID: ${publicId}):`,
        result
      );
      return false;
    }
  } catch (error) {
    console.error("Error during Cloudinary deletion process:", error);
    return false;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
