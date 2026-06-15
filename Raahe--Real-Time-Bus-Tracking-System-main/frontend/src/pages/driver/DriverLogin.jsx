import { DriverLogin } from "@/components/driver/driver-login";

export default function DriverLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-serif font-semibold">Driver Login</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Login with your Driver ID and registered mobile number.
      </p>
      <div className="mt-4">
        <DriverLogin />
      </div>
    </main>
  );
}
