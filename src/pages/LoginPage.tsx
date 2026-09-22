import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  KeyRound,
  RefreshCw,
  Info
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { User } from '../types';
import { AUTH_CONFIG } from '../config/authConfig';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  initialError?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, initialError }) => {
  const [authConfig, setAuthConfig] = useState<{ googleClientId: string; allowedDomain: string; isDevMode: boolean }>({
    googleClientId: '',
    allowedDomain: AUTH_CONFIG.DEFAULT_ALLOWED_DOMAIN,
    isDevMode: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null);

  // Dev mode login state
  const [devEmail, setDevEmail] = useState('executive@turkysgroup.co.tz');
  const [devName, setDevName] = useState('Senior Executive');
  const [showDevPanel, setShowDevPanel] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load auth config on mount
  useEffect(() => {
    let mounted = true;
    apiClient.getAuthConfig().then(cfg => {
      if (mounted) {
        setAuthConfig(cfg);
        if (cfg.isDevMode && !cfg.googleClientId) {
          setShowDevPanel(true);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Google Sign-In button if Google Client ID is configured and window.google is loaded
  useEffect(() => {
    if (!authConfig.googleClientId) return;

    const interval = setInterval(() => {
      const google = (window as any).google;
      if (google?.accounts?.id && googleBtnRef.current) {
        clearInterval(interval);
        try {
          google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 320
          });
        } catch (err) {
          console.error('[Google GSI] Init failed:', err);
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [authConfig.googleClientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    setErrorMessage(null);
    setAccessDeniedEmail(null);

    const result = await apiClient.loginWithGoogle(response.credential);
    setIsLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      if (result.error === 'ACCESS_RESTRICTED') {
        setAccessDeniedEmail('Non-company account');
      }
      setErrorMessage(result.message || 'Authentication rejected.');
    }
  };

  const handleDevLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!devEmail.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAccessDeniedEmail(null);

    const result = await apiClient.loginDev(devEmail.trim(), devName.trim() || undefined);
    setIsLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      if (result.error === 'ACCESS_RESTRICTED') {
        setAccessDeniedEmail(devEmail.trim());
      }
      setErrorMessage(result.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div id="vigor-login-screen" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background Decorative Grid and Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 backdrop-blur-xl">
          
          {/* Header & Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 mb-4 ring-4 ring-indigo-500/10">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
              VIGOR <span className="text-indigo-400 font-semibold text-lg">Intelligent Analytics</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Turkys Group Executive & Operational Intelligence
            </p>

            {/* Corporate Domain Security Badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authorised Personnel Only: <strong>@{authConfig.allowedDomain}</strong></span>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-rose-300">
                  {accessDeniedEmail ? 'Access Restricted' : 'Authentication Notice'}
                </div>
                <div className="mt-1 text-xs text-rose-200/90 leading-relaxed">
                  {errorMessage}
                </div>
                {accessDeniedEmail && (
                  <div className="mt-2 text-xs text-rose-300 bg-rose-900/40 p-2 rounded border border-rose-800/50">
                    Domain policy enforced: accounts must end in <strong>@{authConfig.allowedDomain}</strong>. Public accounts (e.g. Gmail, Yahoo) are prohibited.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Primary Login Section */}
          <div className="space-y-4">
            {/* Google OAuth Button Container */}
            {authConfig.googleClientId ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center w-full" />
                <p className="text-xs text-slate-500 text-center">
                  Sign in with your official @{authConfig.allowedDomain} Google Workspace account
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
                <div className="text-xs text-slate-400">
                  Google Workspace Single Sign-On Ready
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Connect your Google Client ID via settings or use the secure company portal below
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-medium tracking-wider">
                  Corporate Verification
                </span>
              </div>
            </div>

            {/* Direct VIGOR Account Portal */}
            <form onSubmit={handleDevLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  VIGOR Company Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder={`name@${authConfig.allowedDomain}`}
                    className="w-full pl-3 pr-24 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    required
                  />
                  <div className="absolute right-2 top-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">
                    @{authConfig.allowedDomain}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Display Name / Role
                </label>
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="e.g. Executive Director"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In with VIGOR Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Accounts for Demonstration / Verification */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>Quick Access Test Presets:</span>
                <button
                  type="button"
                  onClick={() => setShowDevPanel(!showDevPanel)}
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  {showDevPanel ? 'Hide Presets' : 'Show Presets'}
                </button>
              </div>

              {showDevPanel && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setDevEmail('executive@turkysgroup.co.tz');
                      setDevName('Senior Executive');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/70 text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-emerald-400">Authorised VIGOR User:</span>{' '}
                      <span className="text-slate-300 font-mono">executive@turkysgroup.co.tz</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">Valid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDevEmail('admin@turkysgroup.co.tz');
                      setDevName('System Admin');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/70 text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-indigo-400">Admin Account:</span>{' '}
                      <span className="text-slate-300 font-mono">admin@turkysgroup.co.tz</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDevEmail('external.guest@gmail.com');
                      setDevName('External User');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-rose-400">Test Non-VIGOR Rejection:</span>{' '}
                      <span className="text-rose-200/80 font-mono">external.guest@gmail.com</span>
                    </div>
                    <span className="text-[10px] text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50">Rejects</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Security Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>256-bit Encrypted Session & MySQL Audit Persistence</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Strictly confidential. Unauthorized access attempts are monitored and logged.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
