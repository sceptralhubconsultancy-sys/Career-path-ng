import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { adminLoginSchema, type AdminLoginValues } from '../lib/schemas';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
  });

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session?.user) {
          const { data: adminRow } = await supabase!
            .from('admin_users')
            .select('user_id')
            .eq('user_id', data.session.user.id)
            .maybeSingle();
          if (adminRow) {
            navigate('/admin', { replace: true });
            return;
          }
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [navigate]);

  const onSubmit = async (values: AdminLoginValues) => {
    setAuthError(null);
    if (!supabase) {
      setAuthError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'
      );
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !data.user) {
      setAuthError(error?.message || 'Invalid email or password.');
      return;
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (adminErr || !adminRow) {
      await supabase.auth.signOut();
      setAuthError('This account does not have admin access.');
      return;
    }

    navigate('/admin', { replace: true });
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-8">
          <div className="w-11 h-11 rounded-[12px] bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>

          <h1 className="text-[24px] leading-[32px] font-bold text-[#1C1917]">
            Admin sign in
          </h1>
          <p className="mt-1.5 text-sm text-[#6B6A65]">
            Sign in with your PathShift admin credentials to view leads and
            export reports.
          </p>

          {!isSupabaseConfigured && (
            <div
              role="alert"
              className="mt-5 px-4 py-3 rounded-[12px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-sm text-[#1C1917]"
            >
              Supabase environment variables are not configured yet.
            </div>
          )}

          {checkingSession ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm font-medium text-[#1C1917] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-medium text-[#1C1917] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
                {errors.password && (
                  <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {authError && (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-[12px] bg-[#DC2626]/[0.06] border border-[#DC2626]/25 text-sm text-[#DC2626]"
                >
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="w-full min-h-[48px] rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/50 text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Sign in</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
