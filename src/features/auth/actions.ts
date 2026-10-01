'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import type {EmailOtpType} from '@supabase/supabase-js';
import {appOrigin,isolatedProviderClient,providerClient,verifiedProviderIdentity} from '@/server/auth/provider';
import {openData,openIntent,sealData} from '@/server/auth/sealed-intent';
import {clearSessionSecret,newSessionSecret,writeSessionSecret} from '@/server/sessions/cookie';
import {applicationIdentity,citizenRecoveryAllowed,createApplicationSession,provisionCitizen,provisioningState,revokeCurrentSession,secureCitizenSessions,updateCitizenProfile} from '@/server/identity/repository';
import {redirectAuthenticatedUser} from '@/server/auth/application-user';
import {currentCitizen} from '@/server/auth/current-citizen';
import {clearPendingSignup,readPendingSignup,storePendingSignup} from '@/server/auth/pending-signup';
import {completeRegistrationSchema,emailChangeSchema,loginSchema,passwordChangeSchema,profileSchema,recoverySchema,resetSchema,safeReturnTo,signupSchema,normalizePhone,type AuthState} from './model';

const INTENT_COOKIE='abaynou_auth_intent',RECOVERY_COOKIE='abaynou_recovery_authorized';
const fail=(code:string):AuthState=>({status:'error',code});
const success=(code:string):AuthState=>({status:'success',code});

export async function signupAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=signupSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail(parsed.error.issues[0]?.message??'validation');
 await redirectAuthenticatedUser(parsed.data.locale);
 let phone:string|null;try{phone=normalizePhone(parsed.data.phone);}catch{return fail('phoneInvalid');}
 const provider=isolatedProviderClient();const {data,error}=await provider.auth.signUp({email:parsed.data.email.toLowerCase(),password:parsed.data.password,options:{emailRedirectTo:`${appOrigin()}/${parsed.data.locale}/auth/confirm`,data:{language:parsed.data.locale}}});
 if(!error&&data.user&&data.user.identities?.length){
  try{await provisionCitizen({authUserId:data.user.id,fullName:parsed.data.fullName,phone,language:parsed.data.locale,termsVersionId:parsed.data.termsVersionId,privacyVersionId:parsed.data.privacyVersionId});}
  catch{await storePendingSignup(parsed.data.email.toLowerCase());redirect(`/${parsed.data.locale}/check-email`);}
 }
 await storePendingSignup(parsed.data.email.toLowerCase());redirect(`/${parsed.data.locale}/check-email`);
}

export async function loginAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=loginSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');
 await redirectAuthenticatedUser(parsed.data.locale);
 const client=await providerClient();const {error}=await client.auth.signInWithPassword({email:parsed.data.email.toLowerCase(),password:parsed.data.password});
 if(error)return fail('invalidCredentials');
 const identity=await verifiedProviderIdentity(client);if(!identity){await client.auth.signOut({scope:'local'});return fail('invalidCredentials');}
 const state=await provisioningState(identity.authUserId);
 const profile=await applicationIdentity(identity.authUserId);
 if(profile&&profile.role!=='CITIZEN'){await client.auth.signOut({scope:'local'});await clearSessionSecret();return fail('invalidCredentials');}
 if(!state){redirect(`/${parsed.data.locale}/complete-registration`);}
 if(state.state==='DISABLED'){await client.auth.signOut({scope:'local'});redirect(`/${parsed.data.locale}/account-disabled`);}
 if(state.state!=='COMPLETE'){redirect(`/${parsed.data.locale}/complete-registration`);}
 const secret=newSessionSecret();const session=await createApplicationSession(identity.authUserId,identity.providerSessionId,secret.digest);
 if(!session){await client.auth.signOut({scope:'local'});return fail('accountUnavailable');}
 await writeSessionSecret(secret.raw,new Date(session.absolute_expires_at));redirect(safeReturnTo(parsed.data.returnTo,parsed.data.locale));
}

export async function recoveryAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=recoverySchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');
 let allowed=false;try{allowed=await citizenRecoveryAllowed(parsed.data.email);}catch{/* Fail closed without revealing account state. */}
 if(allowed){
  const client=isolatedProviderClient();await client.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(),{redirectTo:`${appOrigin()}/${parsed.data.locale}/auth/confirm`});
 }
 return success('recoverySent');
}

export async function resendVerificationAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=recoverySchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');
 const client=isolatedProviderClient();await client.auth.resend({type:'signup',email:parsed.data.email.toLowerCase(),options:{emailRedirectTo:`${appOrigin()}/${parsed.data.locale}/auth/confirm`}});
 return success('verificationResent');
}

export async function resendPendingVerificationAction(_:AuthState,form:FormData):Promise<AuthState>{
 const locale=String(form.get('locale'));if(!['ar','fr','en'].includes(locale))return fail('validation');
 const pending=await readPendingSignup();if(!pending)return fail('linkInvalid');
 const client=isolatedProviderClient();await client.auth.resend({type:'signup',email:pending.email,options:{emailRedirectTo:`${appOrigin()}/${locale}/auth/confirm`}});
 return success('verificationResent');
}

export async function confirmEmailAction(previous:AuthState,form:FormData):Promise<AuthState>{
 void previous;void form;
 const store=await cookies(),intent=openIntent(store.get(INTENT_COOKIE)?.value);if(!intent)return fail('linkInvalid');
 const client=await providerClient();const {error}=await client.auth.verifyOtp({token_hash:intent.tokenHash,type:intent.type as EmailOtpType});
 store.delete(INTENT_COOKIE);if(error)return fail('linkInvalid');
 const identity=await verifiedProviderIdentity(client);if(!identity)return fail('linkInvalid');
 if(intent.type==='recovery'){
  const profile=await applicationIdentity(identity.authUserId);if(profile?.role!=='CITIZEN'||profile.access_status!=='ACTIVE'){await client.auth.signOut({scope:'local'});return fail('linkInvalid');}
  store.set(RECOVERY_COOKIE,sealData({authUserId:identity.authUserId,providerSessionId:identity.providerSessionId,expires:Date.now()+15*60_000}),{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:900});
  redirect(`/${intent.locale}/reset-password`);
 }
 if(intent.type==='email_change'){
  const profile=await applicationIdentity(identity.authUserId);if(profile?.role!=='CITIZEN'){await client.auth.signOut({scope:'local'});return fail('linkInvalid');}
  if(profile.access_status!=='ACTIVE'){await client.auth.signOut({scope:'global'});await clearSessionSecret();redirect(`/${intent.locale}/account-disabled`);}
  try{await secureCitizenSessions({authUserId:identity.authUserId,reason:'EMAIL_CHANGE',keepProviderSessionId:null,currentDigest:null,newDigest:null});}catch{await client.auth.signOut({scope:'global'});await clearSessionSecret();redirect(`/${intent.locale}/account-disabled`);}
  await client.auth.signOut({scope:'global'});await clearSessionSecret();redirect(`/${intent.locale}/verify-email?state=email-changed`);
 }
 const state=await provisioningState(identity.authUserId);
 if(!state||state.state==='INCOMPLETE')redirect(`/${intent.locale}/complete-registration`);
 await clearPendingSignup();
 await client.auth.signOut({scope:'local'});redirect(`/${intent.locale}/verify-email?state=verified`);
}

export async function completeRegistrationAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=completeRegistrationSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');const identity=await verifiedProviderIdentity();if(!identity)return fail('authenticationRequired');
 let phone:string|null;try{phone=normalizePhone(parsed.data.phone);}catch{return fail('phoneInvalid');}
 try{await provisionCitizen({authUserId:identity.authUserId,fullName:parsed.data.fullName,phone,language:parsed.data.locale,termsVersionId:parsed.data.termsVersionId,privacyVersionId:parsed.data.privacyVersionId});}catch{return fail('legalChanged');}
 const client=await providerClient();await client.auth.signOut({scope:'local'});redirect(`/${parsed.data.locale}/verify-email?state=registration-complete`);
}

export async function resetPasswordAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=resetSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail(parsed.error.issues[0]?.message??'validation');
 const store=await cookies();const marker=openData<{authUserId:string;providerSessionId:string;expires:number}>(store.get(RECOVERY_COOKIE)?.value);const client=await providerClient();const identity=await verifiedProviderIdentity(client);
 if(!marker||!identity||marker.authUserId!==identity.authUserId||marker.providerSessionId!==identity.providerSessionId)return fail('linkInvalid');
 const profile=await applicationIdentity(identity.authUserId);if(!profile||profile.role!=='CITIZEN'||profile.access_status!=='ACTIVE')return fail('linkInvalid');
 try{await secureCitizenSessions({authUserId:identity.authUserId,reason:'PASSWORD_RESET',keepProviderSessionId:null,currentDigest:null,newDigest:null});}catch{return fail('linkInvalid');}
 const {error}=await client.auth.updateUser({password:parsed.data.password});if(error)return fail('operationFailed');
 await client.auth.signOut({scope:'global'});store.delete(RECOVERY_COOKIE);await clearSessionSecret();redirect(`/${parsed.data.locale}/login?state=password-reset`);
}

async function verifyCurrentPassword(email:string,password:string){const temp=isolatedProviderClient();const {error}=await temp.auth.signInWithPassword({email,password});if(error)return false;await temp.auth.signOut({scope:'local'});return true;}

export async function changePasswordAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=passwordChangeSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail(parsed.error.issues[0]?.message??'validation');const citizen=await currentCitizen();if(!citizen||citizen.state!=='VALID')return fail('authenticationRequired');
 if(!await verifyCurrentPassword(citizen.email,parsed.data.currentPassword))return fail('reauthenticationFailed');
 const fresh=newSessionSecret();await secureCitizenSessions({authUserId:citizen.authUserId,reason:'PASSWORD_CHANGE',keepProviderSessionId:citizen.providerSessionId,currentDigest:citizen.digest,newDigest:fresh.digest});await writeSessionSecret(fresh.raw,new Date(citizen.absoluteExpiresAt));
 const client=await providerClient();const {error}=await client.auth.updateUser({password:parsed.data.password,current_password:parsed.data.currentPassword});if(error)return fail('operationFailed');await client.auth.signOut({scope:'others'});return success('passwordChanged');
}

export async function changeEmailAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=emailChangeSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');const citizen=await currentCitizen();if(!citizen||citizen.state!=='VALID')return fail('authenticationRequired');
 if(!await verifyCurrentPassword(citizen.email,parsed.data.currentPassword))return fail('reauthenticationFailed');
 const fresh=newSessionSecret();await secureCitizenSessions({authUserId:citizen.authUserId,reason:'EMAIL_CHANGE',keepProviderSessionId:citizen.providerSessionId,currentDigest:citizen.digest,newDigest:fresh.digest});await writeSessionSecret(fresh.raw,new Date(citizen.absoluteExpiresAt));
 const client=await providerClient();const {error}=await client.auth.updateUser({email:parsed.data.email.toLowerCase()},{emailRedirectTo:`${appOrigin()}/${parsed.data.locale}/auth/confirm`});if(error)return fail('operationFailed');return success('emailChangeSent');
}

export async function updateProfileAction(_:AuthState,form:FormData):Promise<AuthState>{
 const parsed=profileSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return fail('validation');const citizen=await currentCitizen();if(!citizen||citizen.state!=='VALID')return fail('authenticationRequired');let phone:string|null;try{phone=normalizePhone(parsed.data.phone);}catch{return fail('phoneInvalid');}
 try{await updateCitizenProfile({authUserId:citizen.authUserId,providerSessionId:citizen.providerSessionId,digest:citizen.digest,revision:parsed.data.revision,fullName:parsed.data.fullName,phone,language:parsed.data.language});}catch{return fail('conflict');}
 (await cookies()).set('NEXT_LOCALE',parsed.data.language,{sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:31536000});redirect(`/${parsed.data.language}/citizen/account?state=saved`);
}

export async function logoutAction(form?:FormData){const localeValue=form?.get('locale'),locale=localeValue==='fr'||localeValue==='en'?localeValue:'ar';const citizen=await currentCitizen();if(citizen)await revokeCurrentSession(citizen.authUserId,citizen.providerSessionId,citizen.digest);const client=await providerClient();await client.auth.signOut({scope:'local'});await clearSessionSecret();redirect(`/${locale}`);}
