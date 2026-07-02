import { SignInForm } from "./SignInForm";

type SignInPageProps = {
  searchParams?: {
    created?: string;
    reset?: string;
    callbackUrl?: string;
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <SignInForm
      created={searchParams?.created === "1"}
      resetOk={searchParams?.reset === "1"}
      callbackUrl={searchParams?.callbackUrl}
    />
  );
}
