import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { LoadingOverlay, Spinner } from './Login.styles'; 

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
import { ToggleContainer, ToggleBtn, ToggleBtnBg } from '@/Components/User/Login.styles';

import { formSchema } from './FormSchema';

const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
};

export const Login = ({setLoggedIn, setUserId, setUsername, apiroot }) => {
    const [isLoginToggled, setIsLoginToggled] = useState(true);
    const [isLoading, setIsLoading] = useState(false); 
    const usernameRef = useRef(null);
    const navigate = useNavigate(); 

    useEffect(() => {
        setLoggedIn(false);
        setUserId("");
        setUsername("");
        sessionStorage.clear();
        usernameRef.current.focus();
    }, []);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const loginRequest = async (values) => {
        setIsLoading(true);
        let response;
        try {
            response = await axios.post(`${apiroot}/user/login`, {...values});
        } catch(err) {
            console.log(err);
            setLoggedIn(false);
            usernameRef.current.focus();
            toast.error("Login: Failed to login. Check console for error");
            setIsLoading(false);
            return;
        }

        sessionStorage.setItem("JWT", response.data.token);
        let decodedToken = parseJwt(response.data.token);
        setUserId(decodedToken.user_id);
        setUsername(values.username);
        setLoggedIn(true);
        setIsLoading(false);
        navigate('/home');
    };

    const registerRequest = async (values) => {
        setIsLoading(true);
        let response;
        try {
            response = await axios.post(`${apiroot}/user`, {...values});
            await window.electron.createDB();
            await loginRequest(values);

        } catch(err) {
            console.log(err);
            setLoggedIn(false);
            usernameRef.current.focus();
            toast.error("Register: Failed to register. Check console for error");
            setIsLoading(false);
            return;
        } finally {
            setIsLoading(false);
        }
    };

    return(
        <>
            {isLoading && (
                <LoadingOverlay>
                    <Spinner />
                </LoadingOverlay>
            )}
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
                                        <Input placeholder="Username" {...field} ref={usernameRef}/>
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
        </>
    );
};