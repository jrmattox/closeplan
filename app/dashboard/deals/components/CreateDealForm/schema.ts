import { z } from "zod";
import { DealStatus } from "@prisma/client";

export const dealFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z.number().min(0, "Value must be positive"),
  status: z.nativeEnum(DealStatus),
  phi: z.record(z.any()).optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;
