import { Admin, Patient, Prisma, UserRole, UserStatus } from '@prisma/client';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { hashedPassword } from './user.utils';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IUser, IUserFilterRequest } from './user.interface';
import { IAuthUser, IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { userSearchableFields } from './user.constant';
import { Request } from 'express';
import { IUploadFile } from '../../../interfaces/file';
import { FileUploadHelper } from '../../../helpers/fileUploadHelper';
import meiliClient from '../../../shared/meilisearch';

const index = meiliClient.index('doctors');

const createDoctor = async (data: any) => { // Accepting the parsed data directly
  console.log('Request Body:', data);

  // Hash the password before storing it
  const hashPassword = await hashedPassword(data.password);

  // // Extract specialties from request
  // const specialties = data?.specialties;
  // console.log('Specialties:', specialties);

  // // Validate that specialties exist and are an array
  // if (!Array.isArray(specialties) || specialties.length === 0) {
  //   throw new Error('Specialties are missing or not in the correct format.');
  // }

  // // Extract specialty IDs from the objects
  // const specialtyIds = specialties.map((specialty) => specialty?.specialtiesId);

  // const existingSpecialties = await prisma.specialties.findMany({
  //   where: { id: { in: specialtyIds } },
  // });

  // // Check if all specialties exist in the database
  // if (existingSpecialties.length !== specialtyIds.length) {
  //   throw new Error('One or more specialties not found.');
  // }

  // Using a transaction to ensure atomicity
  const result = await prisma.$transaction(async (transactionClient) => {
    // Create the user first
    await transactionClient.user.create({
      data: {
        email: data.doctor.email,
        password: hashPassword,
        role: UserRole.DOCTOR,
      },
    });

    // Create the doctor with doctorSpecialties relationship
    const newDoctor = await transactionClient.doctor.create({
      data: {
        ...data.doctor,
        // doctorSpecialties: {
        //   create: specialtyIds.map((specialtyId) => ({
        //     specialties: {
        //       connect: { id: specialtyId },
        //     },
        //   })),
        // },
      },
      include: {
        doctorSpecialties: true,
      },
    });

    return newDoctor;
  });

  return result;
};
const createAdmin = async (req: Request): Promise<Admin> => {
  const file = req.file as IUploadFile;

  if (file) {
    const uploadedProfileImage =
      await FileUploadHelper.uploadToCloudinary(file);
    req.body.admin.profilePhoto = uploadedProfileImage?.secure_url;
  }

  const hashPassword = await hashedPassword(req.body.password);
  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        email: req.body.admin.email,
        password: hashPassword,
        role: UserRole.ADMIN,
      },
    });
    const newAdmin = await transactionClient.admin.create({
      data: req.body.admin,
    });

    return newAdmin;
  });

  return result;
};

const createPatient = async (req: Request): Promise<Patient> => {
  const file = req.file as IUploadFile;

  if (file) {
    const uploadedProfileImage =
      await FileUploadHelper.uploadToCloudinary(file);
    req.body.patient.profilePhoto = uploadedProfileImage?.secure_url;
  }

  const hashPassword = await hashedPassword(req.body.password);
  const result = await prisma.$transaction(async transactionClient => {
    const newUser = await transactionClient.user.create({
      data: {
        email: req.body.patient.email,
        password: hashPassword,
        role: UserRole.PATIENT,
      },
    });
    const newPatient = await transactionClient.patient.create({
      data: req.body.patient,
    });

    return newPatient;
  });

  return result;
};

const changeProfileStatus = async (userId: string, status: UserStatus) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!isUserExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: status,
  });

  return updatedUser;
};

const getAllUser = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<IUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getMyProfile = async (authUser: any) => {
  const userData = await prisma.user.findUnique({
    where: {
      id: authUser.id,
      status: UserStatus.ACTIVE,
    },
    select: {
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
    },
  });

  let profileData;
  if (userData?.role === UserRole.ADMIN) {
    profileData = await prisma.admin.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.DOCTOR) {
    profileData = await prisma.doctor.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.PATIENT) {
    profileData = await prisma.patient.findUnique({
      where: {
        email: userData.email,
      },
    });
  }
  return { ...profileData, ...userData };
};

const updateMyProfile = async (user: IAuthUser, req: Request) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
      where: {
          email: user?.email,
          status: UserStatus.ACTIVE
      }
  });

  const file = req.file as IUploadFile;
  if (file) {
      const uploadToCloudinary = await FileUploadHelper.uploadToCloudinary(file);
      req.body.profilePhoto = uploadToCloudinary?.secure_url;
  }

  let profileInfo;

  if (userInfo.role === UserRole.SUPER_ADMIN) {
      profileInfo = await prisma.admin.update({
          where: {
              email: userInfo.email
          },
          data: req.body
      })
  }
  else if (userInfo.role === UserRole.ADMIN) {
      profileInfo = await prisma.admin.update({
          where: {
              email: userInfo.email
          },
          data: req.body
      })
  }
  else if (userInfo.role === UserRole.DOCTOR) {
      profileInfo = await prisma.doctor.update({
          where: {
              email: userInfo.email
          },
          data: req.body
      })
  }
  else if (userInfo.role === UserRole.PATIENT) {
      profileInfo = await prisma.patient.update({
          where: {
              email: userInfo.email
          },
          data: req.body
      })
  }

  return { ...profileInfo };
}

export const UserServices = {
  createDoctor,
  createAdmin,
  createPatient,
  changeProfileStatus,
  getAllUser,
  getMyProfile,
  updateMyProfile,
};
