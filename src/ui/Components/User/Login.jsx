import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import './Login.css'

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
import { ToggleContainer, ToggleBtn, ToggleBtnBg } from '@/Components/user/Login.styles';

import { formSchema } from './FormSchema';

const apiroot = 'https://se4450.duckdns.org/api';

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

export const Login = ({setLoggedIn, setUserId, setUsername }) => {
    const [isLoginToggled, setIsLoginToggled] = useState(true);
    const navigate = useNavigate(); 

    useEffect(() => {
        setLoggedIn(false);
        setUserId("");
        setUsername("");
        sessionStorage.clear();
    }, []);

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
            response = await axios.post(`${apiroot}/user/login`, {...values});
        } catch(err) {
            toast.error("Login: Failed to login. Check console for error");
            console.log(err);
            setLoggedIn(false);
            return;
        }

        sessionStorage.setItem("JWT", response.data.token);
        let decodedToken = parseJwt(response.data.token);
        setUserId(decodedToken.user_id);
        setUsername(values.username);
        setLoggedIn(true);
        navigate('/home');
    };

    const registerRequest = async (values) => {
        let response;
        try {
            response = await axios.post(`${apiroot}/user`, {...values});

        } catch(err) {
            toast.error("Register: Failed to register. Check console for error");
            console.log(err);
            setLoggedIn(false);
            return;
        }

        await loginRequest(values);
    };

    return(
        <div className="login-container">
            <h2 className="text-center text-2xl font-bold">{isLoginToggled ? 'Login' : "Register"}</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(isLoginToggled ? loginRequest : registerRequest)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="Username" {...field} />
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
                                    <Input type="password" placeholder="Password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button className="w-full text-base" type="submit">{isLoginToggled ? 'Login' : "Register"}</Button>
                </form>
            </Form>
            <ToggleContainer>
                <ToggleBtnBg $isLoginToggled={isLoginToggled}/>
                <ToggleBtn $isLoginToggled={isLoginToggled} onClick={() => setIsLoginToggled(true)}>Have an account?<br />Log in here</ToggleBtn>
                <ToggleBtn $isLoginToggled={!isLoginToggled} onClick={() => setIsLoginToggled(false)}>New?<br />Register Here</ToggleBtn>
            </ToggleContainer>
        </div>
    );
};