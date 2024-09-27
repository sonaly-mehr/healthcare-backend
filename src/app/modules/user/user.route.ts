import express, { NextFunction, Request, Response } from 'express';
import { UserController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validations';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { FileUploadHelper } from '../../../helpers/fileUploadHelper';

const router = express.Router();

router.get(
  '/',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  UserController.getAllUser,
);

router.get(
  '/me',
  auth(
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.DOCTOR,
    ENUM_USER_ROLE.PATIENT,
    ENUM_USER_ROLE.SUPER_ADMIN,
  ),
  UserController.getMyProfile,
);

router.post(
  '/create-doctor',
  // Uncomment the line below if you want to restrict access to certain user roles
  // auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = UserValidation.createDoctor.parse(req.body);
      
      return UserController.createDoctor(req, res, next);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/create-admin',
  // auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = UserValidation.createAdmin.parse(JSON.parse(req.body.data));
    return UserController.createAdmin(req, res, next);
  },
);

router.post(
  '/create-patient',
  FileUploadHelper.upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = UserValidation.createPatient.parse(JSON.parse(req.body.data));
    return UserController.createPatient(req, res, next);
  },
);

router.patch(
  '/:id/status',
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  validateRequest(UserValidation.updateStatus),
  UserController.changeProfileStatus,
);

router.patch(
  '/update-my-profile',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.DOCTOR,
    ENUM_USER_ROLE.PATIENT,
  ),
  FileUploadHelper.upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    return UserController.updateMyProfile(req, res, next);
  },
);

export const userRoutes = router;
