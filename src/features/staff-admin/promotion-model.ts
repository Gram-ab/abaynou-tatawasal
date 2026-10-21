import {z} from 'zod';
import {localeSchema} from './model';
const reason=z.string().trim().refine(value=>{const length=Array.from(value).length;return length>=3&&length<=1000;});
export const promotionSchema=z.object({locale:localeSchema,profileId:z.uuid(),revision:z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),email:z.email().trim().toLowerCase(),reason,currentPassword:z.string().min(1).max(1024),confirmed:z.literal('on')});
