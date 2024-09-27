import { Specialties } from '@prisma/client';
import prisma from '../../../shared/prisma';
import { Request } from 'express';
import { IUploadFile } from '../../../interfaces/file';
import { FileUploadHelper } from '../../../helpers/fileUploadHelper';

const insertIntoDB = async (req: Request): Promise<Specialties> => {
  const file = req.file as IUploadFile;

  if (file) {
    const uploadIcon = await FileUploadHelper.uploadToCloudinary(file);
    req.body.icon = uploadIcon?.secure_url;
  }
  const result = await prisma.specialties.create({
    data: req.body
  });
  return result;
};

const getAllFromDB = async () => {
  return await prisma.specialties.findMany();
}

const getSingleFromDB = async (id: string): Promise<Specialties | null> => {
  return await prisma.specialties.findUnique({
    where: { id },
  });
};

const deleteFromDB = async (id: string): Promise<Specialties> => {
  const result = await prisma.specialties.delete({
    where: {
      id,
    },
  });
  return result;
};
const updateInDB = async (id: string, data:any): Promise<Specialties | null> => {
  // Handle the file upload separately
  const file = data.file ; // Ensure you are checking for the file
  if (file) {
    // Upload the file to Cloudinary or your chosen file storage
    const uploadIcon = await FileUploadHelper.uploadToCloudinary(file);
    if (uploadIcon?.secure_url) {
      // If file upload is successful, set the icon URL in the data object
      data.icon = uploadIcon.secure_url;
    }
  }

  try {
    // Update the specialty with the provided fields and the new icon URL if available
    const result = await prisma.specialties.update({
      where: { id },
      data, // Only fields present in data will be updated
    });

    return result;
  } catch (error) {
    // Log and handle errors appropriately
    console.error('Error updating specialty:', error);
    return null; // Return null if there's an error, or handle it as needed
  }
};



export const SpecialtiesService = {
  insertIntoDB,
  getAllFromDB,
  getSingleFromDB,
  updateInDB,
  deleteFromDB,
};
