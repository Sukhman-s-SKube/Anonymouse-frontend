import { z } from "zod";

export const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username cannot be blank.",
    }),
    password: z.string().min(1, {
        message: "Password cannot be blank.",
    }), 
});