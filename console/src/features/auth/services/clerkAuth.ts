import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export const useClerkAuth = () => {
  const {
    signIn,
    setActive: setActiveSignIn,
    isLoaded: isSignInLoaded,
  } = useSignIn();
  const {
    signUp,
    setActive: setActiveSignUp,
    isLoaded: isSignUpLoaded,
  } = useSignUp();
  const navigate = useNavigate();

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSignInLoaded || !signIn) {
      return { success: false, error: "Sign in not ready" };
    }

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActiveSignIn({ session: result.createdSessionId });
        navigate("/dashboard");
        return { success: true };
      }

      return { success: false, error: "Sign in incomplete" };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          "Failed to sign in",
      };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!isSignUpLoaded || !signUp) {
      return { success: false, error: "Sign up not ready" };
    }

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      // Check if email verification is required
      if (result.status === "missing_requirements") {
        // Prepare email verification
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

        // Navigate to verification page with email
        navigate("/verify-email", {
          state: { email },
          replace: true,
        });

        return {
          success: false,
          needsVerification: true,
          message: "Please check your email for verification code",
        };
      }

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        navigate("/dashboard");
        return { success: true };
      }

      return { success: false, error: "Sign up incomplete" };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          "Failed to sign up",
      };
    }
  };

  const verifyEmail = async (code: string) => {
    if (!isSignUpLoaded || !signUp) {
      return { success: false, error: "Sign up not ready" };
    }

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        navigate("/dashboard");
        return { success: true };
      }

      return { success: false, error: "Verification incomplete" };
    } catch (error: any) {
      console.error("Verification error:", error);
      return {
        success: false,
        error:
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          "Invalid verification code. Please try again.",
      };
    }
  };

  const resendVerificationCode = async () => {
    if (!isSignUpLoaded || !signUp) {
      return { success: false, error: "Sign up not ready" };
    }

    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          "Failed to resend code",
      };
    }
  };

  // OAuth methods remain the same
  const signInWithGoogle = async () => {
    if (!isSignInLoaded || !signIn) {
      return { success: false, error: "Sign in not ready" };
    }

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.errors?.[0]?.message || "Failed to sign in with Google",
      };
    }
  };

  const signInWithGithub = async () => {
    if (!isSignInLoaded || !signIn) {
      return { success: false, error: "Sign in not ready" };
    }

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_github",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.errors?.[0]?.message || "Failed to sign in with GitHub",
      };
    }
  };

  const signUpWithGoogle = async () => {
    if (!isSignUpLoaded || !signUp) {
      return { success: false, error: "Sign up not ready" };
    }

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.errors?.[0]?.message || "Failed to sign up with Google",
      };
    }
  };

  const signUpWithGithub = async () => {
    if (!isSignUpLoaded || !signUp) {
      return { success: false, error: "Sign up not ready" };
    }

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_github",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.errors?.[0]?.message || "Failed to sign up with GitHub",
      };
    }
  };

  return {
    signInWithEmail,
    signUpWithEmail,
    verifyEmail,
    resendVerificationCode,
    signInWithGoogle,
    signInWithGithub,
    signUpWithGoogle,
    signUpWithGithub,
    isLoaded: isSignInLoaded && isSignUpLoaded,
  };
};
