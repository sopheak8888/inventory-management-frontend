export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-5 border border-danger px-4 py-2.5 text-[13px] text-danger">
      {message}
    </p>
  );
}
