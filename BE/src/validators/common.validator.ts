import { z } from 'zod';

/** A MongoDB ObjectId as a 24-character hex string. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** `/:id` route params. Use with `validate({ params: idParamsSchema })`. */
export const idParamsSchema = z.object({ id: objectIdSchema });

/** Query flag that arrives as the string `'true'` or `'false'`. */
export const booleanQuerySchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');
