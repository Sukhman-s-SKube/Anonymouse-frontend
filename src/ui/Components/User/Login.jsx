import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/Components/ui/button';
import { 
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';

import { formSchema } from './FormSchema';

const apiroot = 'http://localhost:8000/api';

const parseJwt = (token) => {
    const base64Url = token.split('.')[1]; // Get the payload part of the token
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
};

export const Login = ({setLoggedIn, setUserId}) => {
    const username = useRef('');
    const password = useRef('');

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const loginRequest = async (values) => {
        let response;
        try {
            response = await axios.post(`${apiroot}/user/login`, {
                username: values.username,
                password: values.password
            });
            setLoggedIn(true);
        } catch(err) {
            toast.error("Login: Failed to login. Check console for error");
            console.log(err);
            setLoggedIn(false);
            return;
        }

        sessionStorage.setItem("JWT", response.data.token);
        let decodedToken = parseJwt(response.data.token);
        setUserId(decodedToken.userId);
    };

    return(
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(loginRequest)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="username" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Login</Button>
                </form>
            </Form>
        </>
    )
};