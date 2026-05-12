import EmailPasswordFlow from "@/components/ui/email-password-flow"

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background transition-colors duration-300">
      <EmailPasswordFlow />
    </div>
  )
}
