
import * as React from "react";
import AssistedEmailInput from "@/components/ui/assisted-email-input";
import NextButton from "@/components/ui/assisted-next-button";
import PasswordConfirmInput from "@/components/ui/assisted-password-confirmation";

const EmailPasswordFlow = () => {
  const [step, setStep] = React.useState<"email" | "password">("email");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmail = emailRegex.test(email);

  const passwordsMatch =
    password.length > 0 &&
    password === confirm;

  return (
    <div className="relative flex min-h-[450px] w-full items-center justify-center p-10">
      <div className="z-10 w-full max-w-lg space-y-4">

        {step === "email" && (
          <>
            <AssistedEmailInput
              value={email}
              onChange={setEmail}
            />

            <NextButton
              enabled={validEmail}
              onClick={() => setStep("password")}
            />
          </>
        )}

        {step === "password" && (
          <>
            <PasswordConfirmInput
              password={password}
              confirmPassword={confirm}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirm}
            />

            <NextButton
              enabled={passwordsMatch}
              label="Create Account"
              onClick={() => alert("Account Created")}
            />
          </>
        )}

      </div>
    </div>
  );
};

export default EmailPasswordFlow;
