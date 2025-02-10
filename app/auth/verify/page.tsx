export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-2xl font-bold">Check your email</h2>
        <p className="text-center text-gray-600">
          A sign in link has been sent to your email address.
        </p>
        <p className="text-center text-gray-500 text-sm">
          If you don't see it, check your spam folder.
        </p>
      </div>
    </div>
  )
} 