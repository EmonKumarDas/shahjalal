import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerSelectionProps {
  onCustomerSelected: (name: string, phone: string) => void;
}

export function CustomerSelection({
  onCustomerSelected,
}: CustomerSelectionProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
    onCustomerSelected(e.target.value, customerPhone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerPhone(e.target.value);
    onCustomerSelected(customerName, e.target.value);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium mb-2">Customer Information</h3>
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer Name</Label>
        <Input
          id="customerName"
          placeholder="Enter customer name"
          value={customerName}
          onChange={handleNameChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerPhone">Phone Number</Label>
        <Input
          id="customerPhone"
          placeholder="Enter phone number"
          value={customerPhone}
          onChange={handlePhoneChange}
        />
      </div>
    </div>
  );
}
