import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username cannot be blank.",
    }),
    password: z.string().min(1, {
        message: "Password cannot be blank.",
    }), 
});

export const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
        username: "",
        password: "",
    },
});