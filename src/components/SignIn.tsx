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

    // Listen for auth state changes (e.g., when magic link is clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onSignIn();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onSignIn]);

  // Check URL for magic link callback
  useEffect(() => {
    const handleMagicLink = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setMessage({ type: 'error', text: error.message });
          } else {
            // Clear URL hash
            window.history.replaceState(null, '', window.location.pathname);
            onSignIn();
          }
        } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Failed to sign in' });
        }
      }
    };

    handleMagicLink();
  }, [onSignIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Check your email for the magic link! Click the link to sign in.' 
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send magic link' });
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
              Sign in to Todo
            </h1>
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-[#5b5d62] tracking-[-0.198px] text-center">
              Enter your email to receive a magic link
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

            {/* Message */}
            {message && (
              <div className={`box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full ${
                message.type === 'success' 
                  ? 'bg-[rgba(0,200,83,0.1)] text-[#00C853]' 
                  : 'bg-[rgba(239,65,35,0.1)] text-[#EF4123]'
              }`}>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] tracking-[-0.176px]">
                  {message.text}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="bg-[#0b64f9] box-border content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Medium',sans-serif] font-medium text-[18px] text-white tracking-[-0.198px] cursor-pointer hover:bg-[#0954d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>

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

