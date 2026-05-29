import { z } from 'zod';
import { BOOKING_STATUSES } from './types';

export const bookingItemSchema = z.object({
  itemType: z.enum(['gear', 'car']),
  gearId: z.string().uuid().optional(),
  carId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
}).superRefine((value, ctx) => {
  if (value.itemType === 'gear' && !value.gearId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'gearId is required for gear items' });
  }
  if (value.itemType === 'car' && !value.carId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'carId is required for car items' });
  }
});

export const bookingCreateSchema = z.object({
  sourceType: z.enum(['gear_request', 'car_booking', 'manual']),
  sourceId: z.string().uuid().optional(),
  requesterId: z.string().uuid(),
  startAt: z.string().datetime().nullish(),
  endAt: z.string().datetime().nullish(),
  metadata: z.record(z.unknown()).optional(),
  items: z.array(bookingItemSchema).min(1),
  idempotencyKey: z.string().min(6).max(200).nullish(),
});

export const bookingTransitionSchema = z.object({
  nextStatus: z.enum(BOOKING_STATUSES),
  changedBy: z.string().uuid().nullish(),
  reason: z.string().max(2000).nullish(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().min(6).max(200).nullish(),
});
