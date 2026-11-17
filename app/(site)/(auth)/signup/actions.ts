"use server";
export interface SignupState { error: string | null }
export async function signupAction(_previous: SignupState, _formData: FormData): Promise<SignupState> {
  void _previous; void _formData;
  return {error: 'VPR wholesale accounts are invitation-only. Contact your sales rep.'};
}
