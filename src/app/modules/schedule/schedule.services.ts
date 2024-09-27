import { Prisma, Schedule } from '@prisma/client';
import { addHours, addMinutes, format } from 'date-fns';
import prisma from '../../../shared/prisma';
import { ISchedule, IScheduleFilterRequest } from './schedule.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const convertDateTime = async (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + offset);
}

const insertIntoDB = async (payload: ISchedule): Promise<Schedule> => {
  const { startDate, endDate, startTime, endTime } = payload;

  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  for (let date = new Date(currentDate); date <= lastDate; date.setDate(date.getDate() + 1)) {
    // Construct startDateTime and endDateTime for the current day
    const startDateTime = new Date(
      addMinutes(
        addHours(
          `${format(date, 'yyyy-MM-dd')}`,
          Number(startTime.split(':')[0])
        ),
        Number(startTime.split(':')[1])
      )
    );

    const endDateTime = new Date(
      addMinutes(
        addHours(
          `${format(date, 'yyyy-MM-dd')}`,
          Number(endTime.split(':')[0])
        ),
        Number(endTime.split(':')[1])
      )
    );

    // Create the schedule data
    const scheduleData = {
      startDate: await convertDateTime(startDateTime),
      endDate: await convertDateTime(endDateTime)
    };

    // Check if a schedule with the same start and end time already exists
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate
      }
    });

    // If no existing schedule, create a new one
    if (!existingSchedule) {
      const result = await prisma.schedule.create({
        data: scheduleData
      });
      return result; // Return the created schedule
    }
  }

  throw new Error('No new schedule created. The provided time slot may already exist.');
};


const getAllFromDB = async (
  filters: IScheduleFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<Schedule[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { ...filterData } = filters;

  const andConditions: any[] = [];

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (key === "startDate" || key === "endDate") {
          const date = new Date(filterData[key] as string);
          const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0));
          const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999));
          
          return {
            [key]: {
              gte: startOfDay.toISOString(),
              lt: endOfDay.toISOString(),
            },
          };
        }
        return {
          [key]: {
            equals: (filterData as any)[key],
          },
        };
      }),
    });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });

  const total = await prisma.schedule.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: schedules,
  };
};

// const getAllFromDB = async (
//   filters: IScheduleFilterRequest,
//   options: IPaginationOptions,
//   user: any
// ): Promise<IGenericResponse<Schedule[]>> => {
//   const { limit, page, skip } = paginationHelpers.calculatePagination(options);
//   const { startDate, endDate, ...filterData } = filters; // Extracting startDate and endDate from filters

//   const andConditions = [];

//   // Adding date filtering conditions if startDate and endDate are provided
//   if (startDate && endDate) {
//     andConditions.push({
//       AND: [
//         {
//           startDate: {
//             gte: startDate, // Greater than or equal to startDate
//           },
//         },
//         {
//           endDate: {
//             lte: endDate, // Less than or equal to endDate
//           },
//         },
//       ],
//     });
//   }

//   if (Object.keys(filterData).length > 0) {
//     andConditions.push({
//       AND: Object.keys(filterData).map(key => {
//         return {
//           [key]: {
//             equals: (filterData as any)[key],
//           },
//         };
//       }),
//     });
//   }

//   const whereConditions: Prisma.ScheduleWhereInput =
//     andConditions.length > 0 ? { AND: andConditions } : {};


//   const doctorsSchedules = await prisma.doctorSchedule.findMany({
//     where: {
//       doctor: {
//         email: user.email
//       }
//     }
//   });

//   const doctorScheduleIds = new Set(doctorsSchedules.map(schedule => schedule.scheduleId));

//   const result = await prisma.schedule.findMany({
//     where: {
//       ...whereConditions,
//       id: {
//         notIn: [...doctorScheduleIds]
//       }
//     },
//     skip,
//     take: limit,
//     orderBy:
//       options.sortBy && options.sortOrder
//         ? { [options.sortBy]: options.sortOrder }
//         : {
//           createdAt: 'desc',
//         },
//   });
//   const total = await prisma.schedule.count({
//     where: {
//       ...whereConditions,
//       id: {
//         notIn: [...doctorScheduleIds]
//       }
//     }
//   });

//   return {
//     meta: {
//       total,
//       page,
//       limit,
//     },
//     data: result,
//   };
// };

const getByIdFromDB = async (id: string): Promise<Schedule | null> => {
  const result = await prisma.schedule.findUnique({
    where: {
      id,
    },
  });
  return result;
};

const deleteFromDB = async (id: string): Promise<Schedule> => {
  const result = await prisma.schedule.delete({
    where: {
      id,
    },
  });
  return result;
};

export const ScheduleService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  deleteFromDB,
};
