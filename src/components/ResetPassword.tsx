import { useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";

interface ResetPasswordProps {
  onPasswordReset: () => void;
  onCancel: () => void;
}

export function ResetPassword({ onPasswordReset, onCancel }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Check if user is authenticated (Supabase auto-authenticates on password recovery link click)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      const type = hashParams.get('type') || queryParams.get('type');
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');

      console.log('Reset password check:', { 
        hash: window.location.hash.substring(0, 100), 
        search: window.location.search,
        pathname: window.location.pathname,
        type, 
        accessToken: !!accessToken, 
        tokenHash: !!tokenHash,
        hasSession: !!session
      });

      // If user has a session and we're on the reset password page, they can set password
      // Supabase automatically authenticates when the recovery link is clicked
      if (session && (type === 'recovery' || window.location.pathname === '/reset-password')) {
        setIsVerifying(false);
      } else if (type === 'recovery' && tokenHash) {
        // Try to verify the token hash
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) {
          setMessage({ 
            type: 'error', 
            text: 'Invalid or expired password reset link. Please request a new one.' 
          });
        } else {
          // Verification successful, user is now authenticated
          setIsVerifying(false);
        }
      } else if (type === 'recovery' && accessToken) {
        // If we have an access token, the user is already authenticated
        setIsVerifying(false);
      } else {
        // No valid token or session, show error
        setMessage({ 
          type: 'error', 
          text: 'Invalid or expired password reset link. Please request a new one.' 
        });
        setIsVerifying(false);
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Please enter a password' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Password updated successfully! Redirecting...' 
        });
        // Wait a moment then redirect
        setTimeout(() => {
          onPasswordReset();
        }, 1500);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-auto">
      <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-[20px] relative size-full min-h-screen">
        <div className="box-border content-stretch flex flex-col gap-[40px] items-center max-w-[400px] w-full">
          <div className="content-stretch flex flex-col gap-[24px] items-stretch relative shrink-0 w-full">
            <h1 className="font-['Inter:Medium',sans-serif] font-medium leading-[1.2] not-italic relative shrink-0 text-[32px] text-[#e1e6ee] tracking-[-0.352px] text-center">
              Reset Password
            </h1>

            {isVerifying ? (
              <div className="content-stretch flex items-center justify-center relative shrink-0 w-full py-[24px]">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#e1e6ee] tracking-[-0.176px]">
                  Verifying reset link...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="content-stretch flex flex-col gap-[24px] items-stretch relative shrink-0 w-full">
                {/* New Password Input */}
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                  <label htmlFor="newPassword" className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#e1e6ee] tracking-[-0.176px]">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={isLoading}
                    className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#e1e6ee] placeholder:text-[#5b5d62] border-none outline-none focus:bg-[rgba(225,230,238,0.15)] disabled:opacity-50"
                    autoFocus
                  />
                </div>

                {/* Confirm Password Input */}
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                  <label htmlFor="confirmPassword" className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[16px] text-[#e1e6ee] tracking-[-0.176px]">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={isLoading}
                    className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#e1e6ee] placeholder:text-[#5b5d62] border-none outline-none focus:bg-[rgba(225,230,238,0.15)] disabled:opacity-50"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading && password.trim() && confirmPassword.trim()) {
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
                  disabled={isLoading || !password.trim() || !confirmPassword.trim()}
                  className="bg-[#0b64f9] box-border content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Medium',sans-serif] font-medium text-[18px] text-white tracking-[-0.198px] cursor-pointer hover:bg-[#0954d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Updating password...' : 'Update Password'}
                </button>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="bg-transparent box-border content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0 w-full font-['Inter:Regular',sans-serif] font-normal text-[18px] text-[#5b5d62] tracking-[-0.198px] cursor-pointer hover:text-[#e1e6ee] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

