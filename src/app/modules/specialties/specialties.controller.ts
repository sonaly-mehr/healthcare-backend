import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import { SpecialtiesService } from './specialties.services';

const insertIntoDB = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await SpecialtiesService.insertIntoDB(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty created successfully',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtiesService.getAllFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialties data fetched successfully',
    data: result,
  });
});

const getSingleFromDB = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const specialty = await SpecialtiesService.getSingleFromDB(id);
  
  if (!specialty) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Specialty not found',
    });
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty fetched successfully',
    data: specialty,
  });
});

const deleteFromDB = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SpecialtiesService.deleteFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty deleted successfully',
    data: result,
  });
});

const updateInDB = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updatedData = req.body; // This should contain only the fields that need updating

  const result = await SpecialtiesService.updateInDB(id, updatedData);

  if (!result) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Specialty not found for update',
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty updated successfully',
    data: result,
  });
});



export const SpecialtiesController = {
  insertIntoDB,
  getAllFromDB,
  getSingleFromDB,
  updateInDB,
  deleteFromDB,
};
