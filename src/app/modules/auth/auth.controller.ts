import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.services';
import httpStatus from "http-status";

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const { refreshToken } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: false,
    httpOnly: true,
    sameSite:'strict'
  });

  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Logged in successfully!",
      data: {
          accessToken: result.accessToken,
          needPasswordChange: result.needPasswordChange
      }
  })
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(403).json({
      success: false,
      message: 'Refresh token missing',
    });
  }

  // Validate the refresh token
  const result = await AuthService.refreshToken(refreshToken);
  
  // If validation fails
  if (!result) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }

  // Send the new access token
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token generated successfully!',
    data: { accessToken: result.accessToken },
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...passwordData } = req.body;

  await AuthService.changePassword(user, passwordData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully!',
    data: {
      status: 200,
      message: 'Password changed successfully!',
    },
  });
});

const forgotPass = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPass(req.body.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Check your email!',
    data: {
      status: 200,
      message: 'Check your email for reset link!',
    },
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization || '';
  await AuthService.resetPassword(req.body, token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Account recovered!',
    data: {
      status: 200,
      message: 'Password Reset Successfully',
    },
  });
});

export const AuthController = {
  loginUser,
  refreshToken,
  changePassword,
  forgotPass,
  resetPassword,
};
