type Props = { message: string; variant?: "error" | "warning" };

export function ErrorBanner({ message, variant = "error" }: Props) {
  return (
    <p className={variant} role="alert">
      {message}
    </p>
  );
}
