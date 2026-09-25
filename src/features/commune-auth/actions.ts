'use server';
import {authEvent} from '@/server/auth/telemetry';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {appOrigin,providerClient,isolatedProviderClient,verifiedProviderIdentity} from '@/server/auth/provider';
import {openData,sealData} from '@/server/auth/sealed-intent';
import {applicationIdentity,createStaffSession,revokeUserSession,secureStaffSessions,updateStaffLanguage} from '@/server/identity/repository';
import {currentApplicationUser,requireCommuneStaff,redirectAuthenticatedUser} from '@/server/auth/application-user';
import {clearSessionSecret,newSessionSecret,writeSessionSecret} from '@/server/sessions/cookie';
import {loginSchema,recoverySchema,type AuthState} from '@/features/auth/model';
import {isStaff,staffPassword,staffResetSchema,staffReturnTo,staffLanguageSchema} from './model';
const fail=(code:string):AuthState=>{if(code==='invalid')authEvent('staff_login_denied');if(code==='link')authEvent('staff_recovery_denied');return {status:'error',code};};
const localeOf=(form:FormData)=>form.get('locale')==='fr'?'fr':form.get('locale')==='en'?'en':'ar';
type Recovery={authUserId:string;providerSessionId:string;expires:number;audience:'COMMUNE'};
type Intent={tokenHash:string;expires:number;audience:'COMMUNE'};

export async function staffLogin(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=loginSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('invalid');
 await redirectAuthenticatedUser(parsed.data.locale);
 const {email,password,locale}=parsed.data,client=await providerClient();
 const {error}=await client.auth.signInWithPassword({email:email.toLowerCase(),password});if(error)return fail('invalid');
 const identity=await verifiedProviderIdentity(client),profile=identity?await applicationIdentity(identity.authUserId):null;
 if(!identity||!profile||!isStaff(profile.role)||!staffPassword.safeParse(password).success){await client.auth.signOut({scope:'local'});await clearSessionSecret();return fail('invalid');}
 if(profile.access_status!=='ACTIVE'){authEvent('staff_disabled');await client.auth.signOut({scope:'local'});await clearSessionSecret();redirect(`/${locale}/commune/account-disabled`);}
 const secret=newSessionSecret(),session=await createStaffSession(identity.authUserId,identity.providerSessionId,secret.digest);
 if(!session){await client.auth.signOut({scope:'local'});return fail('invalid');}
 await writeSessionSecret(secret.raw,new Date(session.absolute_expires_at));redirect(staffReturnTo(parsed.data.returnTo,locale));
}
export async function staffLogout(form:FormData){const locale=localeOf(form),user=await currentApplicationUser();if(user&&isStaff(user.role))await revokeUserSession(user.authUserId,user.providerSessionId,user.digest);const client=await providerClient();await client.auth.signOut({scope:'local'});await clearSessionSecret();redirect(`/${locale}/commune/login`);}
export async function staffRecovery(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=recoverySchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('invalid');
 const client=isolatedProviderClient();await client.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(),{redirectTo:`${appOrigin()}/${parsed.data.locale}/commune/auth/confirm`});
 return {status:'success',code:'sent'};
}
export async function staffConfirmRecovery(_:AuthState,form:FormData):Promise<AuthState>{
 const locale=localeOf(form),store=await cookies(),intent=openData<Intent>(store.get('abaynou_staff_intent')?.value);
 if(!intent||intent.audience!=='COMMUNE')return fail('link');
 store.delete('abaynou_staff_intent');const client=await providerClient();
 const {error}=await client.auth.verifyOtp({token_hash:intent.tokenHash,type:'recovery'});if(error)return fail('link');
 const identity=await verifiedProviderIdentity(client),profile=identity?await applicationIdentity(identity.authUserId):null;
 if(!identity||!profile||!isStaff(profile.role)||profile.access_status!=='ACTIVE'){await client.auth.signOut({scope:'local'});return fail('link');}
 store.set('abaynou_staff_recovery',sealData({authUserId:identity.authUserId,providerSessionId:identity.providerSessionId,audience:'COMMUNE',expires:Date.now()+900_000}),{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:900});
 redirect(`/${locale}/commune/reset-password`);
}
export async function staffReset(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=staffResetSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail(parsed.error.issues[0]?.message??'invalid');
 const locale=localeOf(form),store=await cookies(),marker=openData<Recovery>(store.get('abaynou_staff_recovery')?.value),client=await providerClient(),identity=await verifiedProviderIdentity(client);
 if(!marker||marker.audience!=='COMMUNE'||!identity||marker.authUserId!==identity.authUserId||marker.providerSessionId!==identity.providerSessionId)return fail('link');
 const profile=await applicationIdentity(identity.authUserId);if(!profile||!isStaff(profile.role)||profile.access_status!=='ACTIVE')return fail('link');
 // Revoke before the provider mutation: a partial provider failure remains fail-closed.
 await secureStaffSessions(identity.authUserId,'PASSWORD_RESET');
 const {error}=await client.auth.updateUser({password:parsed.data.password});if(error)return fail('failed');
 await client.auth.signOut({scope:'global'});store.delete('abaynou_staff_recovery');store.delete('abaynou_staff_intent');await clearSessionSecret();redirect(`/${locale}/commune/login?state=password-reset`);
}
export async function staffChangePassword(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=staffResetSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail(parsed.error.issues[0]?.message??'invalid');
 const locale=localeOf(form),user=await requireCommuneStaff(locale,true),current=String(form.get('currentPassword')??'');if(!current||current.length>2048)return fail('reauth');
 const isolated=isolatedProviderClient(),{data,error}=await isolated.auth.signInWithPassword({email:user.email,password:current});
 if(error||data.user?.id!==user.authUserId)return fail('reauth');await isolated.auth.signOut({scope:'local'});
 const fresh=newSessionSecret();await secureStaffSessions(user.authUserId,'PASSWORD_CHANGE',user.providerSessionId,user.digest,fresh.digest);await writeSessionSecret(fresh.raw,new Date(user.absoluteExpiresAt));
 const client=await providerClient(),result=await client.auth.updateUser({password:parsed.data.password,current_password:current});if(result.error)return fail('failed');
 await client.auth.signOut({scope:'others'});return {status:'success',code:'saved'};
}
export async function staffSaveLanguage(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=staffLanguageSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('invalid');const user=await requireCommuneStaff(localeOf(form));
 try{await updateStaffLanguage(user.authUserId,user.providerSessionId,user.digest,parsed.data.revision,parsed.data.language);}catch{return fail('conflict');}
 (await cookies()).set('NEXT_LOCALE',parsed.data.language,{sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:31536000});redirect(`/${parsed.data.language}/commune/account?state=saved`);
}
