import { useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";

interface SignInProps {
  onSignIn: () => void;
}

// Check if we're in development mode (localhost)
const isDevelopment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

export function SignIn({ onSignIn }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const isDev = isDevelopment();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          onSignIn();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onSignIn();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onSignIn]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          // Check if email confirmation is required
          const needsConfirmation = data?.user && !data?.session;
          if (needsConfirmation) {
            setMessage({ 
              type: 'success', 
              text: 'Account created! Please check your email to confirm your account before signing in.' 
            });
          } else {
            setMessage({ 
              type: 'success', 
              text: 'Account created! You can now sign in.' 
            });
          }
          setIsSignUp(false);
          setPassword("");
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          // Provide more helpful error messages
          let errorMessage = error.message;
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            errorMessage = 'Invalid email or password. If you signed up with a magic link, you need to set a password first. Use "Forgot password?" to set one.';
          }
          setMessage({ type: 'error', text: errorMessage });
        } else if (data?.user) {
          // Success - onAuthStateChange will handle calling onSignIn
          onSignIn();
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to authenticate' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-0 relative size-full min-h-screen">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
      <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-[20px] relative size-full min-h-screen">
        <div className="box-border content-stretch flex flex-col gap-[40px] items-center max-w-[400px] w-full">
          {/* Title */}
          <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0 w-full">
            <h1 className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[32px] text-white tracking-[-0.352px] text-center">
              {isSignUp ? 'Create account' : 'Sign in to Todo'}
            </h1>
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-[#5b5d62] tracking-[-0.198px] text-center">
              {isSignUp ? 'Create an account to get started' : 'Enter your email and password'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="content-stretch flex flex-col gap-[24px] items-stretch relative shrink-0 w-full">
            {/* Email Input */}
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
              <label htmlFor="email" className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#e1e6ee] tracking-[-0.176px]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#e1e6ee] placeholder:text-[#5b5d62] border-none outline-none focus:bg-[rgba(225,230,238,0.15)] disabled:opacity-50"
                autoFocus
              />
            </div>

            {/* Password Input */}
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
              <div className="flex items-center justify-between w-full">
                <label htmlFor="password" className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#e1e6ee] tracking-[-0.176px]">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!email.trim()) {
                        setMessage({ type: 'error', text: 'Please enter your email address first' });
                        return;
                      }
                      setIsLoading(true);
                      setMessage(null);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) {
                          setMessage({ type: 'error', text: error.message });
                        } else {
                          setMessage({ 
                            type: 'success', 
                            text: 'Password reset email sent! Check your inbox.' 
                          });
                        }
                      } catch (error: any) {
                        setMessage({ type: 'error', text: error.message || 'Failed to send reset email' });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[14px] tracking-[-0.154px] bg-transparent border-none p-0 cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      color: '#0b64f9',
                      pointerEvents: isLoading ? 'none' : 'auto'
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#e1e6ee] placeholder:text-[#5b5d62] border-none outline-none focus:bg-[rgba(225,230,238,0.15)] disabled:opacity-50"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading && email.trim() && password.trim()) {
                    handleSubmit(e as any);
                  }
                }}
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full ${
                message.type === 'success' 
                  ? 'bg-[rgba(0,200,83,0.1)] text-[#e1e6ee]' 
                  : 'bg-[rgba(239,65,35,0.1)] text-[#e1e6ee]'
              }`}>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] tracking-[-0.176px]">
                  {message.text}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="bg-[#0b64f9] box-border content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Medium',sans-serif] font-medium text-[18px] text-white tracking-[-0.198px] cursor-pointer hover:bg-[#0954d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>

          </form>

          {/* Toggle Sign Up / Sign In - Outside form to avoid submit issues */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSignUp(!isSignUp);
              setMessage(null);
              setPassword("");
            }}
            disabled={isLoading}
            className="content-stretch flex items-center justify-center gap-[8px] relative shrink-0 w-full bg-transparent border-none p-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#5b5d62] tracking-[-0.176px]">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <span className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#0b64f9] tracking-[-0.176px] hover:text-[#0954d0]">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </span>
          </button>

          {/* Development Bypass - Only show on localhost */}
          {isDev && (
            <div className="content-stretch flex flex-col gap-[16px] items-stretch relative shrink-0 w-full mt-[24px] pt-[24px] border-t border-[rgba(225,230,238,0.1)]">
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[14px] text-[#5b5d62] tracking-[-0.154px] text-center">
                Development Mode
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Sign in anonymously for development
                    const { error } = await supabase.auth.signInAnonymously();
                    if (error) {
                      setMessage({ type: 'error', text: error.message });
                    } else {
                      onSignIn();
                    }
                  } catch (error: any) {
                    setMessage({ type: 'error', text: error.message || 'Failed to sign in' });
                  }
                }}
                className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#e1e6ee] tracking-[-0.198px] cursor-pointer hover:bg-[rgba(225,230,238,0.15)] transition-colors"
              >
                Skip sign-in (dev only)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

