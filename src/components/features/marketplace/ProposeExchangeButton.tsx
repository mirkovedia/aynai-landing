"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProposeExchangeForm } from "./ProposeExchangeForm";

interface ProposeExchangeButtonProps {
  recipientId: string;
  recipientName: string;
  recipientOffers: string[];
  myOffers: string[];
}

/** CTA "Proponer Ayni": despliega el formulario de propuesta bajo la tarjeta. */
export const ProposeExchangeButton = ({
  recipientId,
  recipientName,
  recipientOffers,
  myOffers,
}: ProposeExchangeButtonProps) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button as="button" type="button" size="sm" onClick={() => setOpen(true)}>
        Proponer Ayni
      </Button>
    );
  }

  return (
    <ProposeExchangeForm
      recipientId={recipientId}
      recipientName={recipientName}
      recipientOffers={recipientOffers}
      myOffers={myOffers}
      onClose={() => setOpen(false)}
    />
  );
};
