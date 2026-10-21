import 'server-only';
import {cache} from 'react';
import {adminDb,configured} from './supabase/server';
import {contentSchema,defaultContent,type SiteContent} from './cms-schema';
export const getContent=cache(async():Promise<SiteContent>=>{if(!configured()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return defaultContent;const {data}=await adminDb().from('settings').select('value').eq('key','content').maybeSingle();const parsed=contentSchema.safeParse(data?.value);return parsed.success?parsed.data:defaultContent;});
