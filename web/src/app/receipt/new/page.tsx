"use client";

import { AuthGate } from "@/components/auth-gate";
import { CreateReceiptFlow } from "@/components/create-receipt-flow";

export default function NewReceiptPage() {
  return (
    <AuthGate>
      <CreateReceiptFlow />
    </AuthGate>
  );
}
