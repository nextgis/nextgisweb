import { useEffect, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";

const DELETE_LOCK_SECONDS = 5;

interface CountdownButtonProps extends ButtonProps {
  lockSeconds?: number;
}

export function CountdownButton({
  children,
  lockSeconds = DELETE_LOCK_SECONDS,
  disabled,
  ...restParams
}: CountdownButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(lockSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <Button disabled={disabled || secondsLeft > 0} {...restParams}>
      {children}
      {secondsLeft > 0 && ` (${secondsLeft})`}
    </Button>
  );
}

CountdownButton.displayName = "CountdownButton";
