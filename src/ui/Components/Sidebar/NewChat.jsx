import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import axios from 'axios';

import { IoIosArrowRoundBack } from "react-icons/io";
import { Wrapper } from "@/Components/Sidebar/NewChat.styles";
import { 
    Form,
    FormControl,
    FormField,
    FormItem
} from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';
import { toast } from 'sonner';
import { Button } from '@/Components/ui/button';

export const NewChat = ({ isOpen, toggle, apiroot }) => {
    const searchInputRef = useRef(null);
    const [usernames, setUsernames] = useState([]);

    const formSchema = z.object({
        usernameSearch: z.string().min(1),
    });
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            usernameSearch: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset();
            searchInputRef.current.focus();
            setUsernames([]);
        }
    }, [form, isOpen]);

    const searchUserReq = async (values) => {
        let response;
        try {
            response = await axios.get(`${apiroot}/user/name/${values.usernameSearch}`, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                }
            });
        } catch(err) {
            if (err.status == 404) {
                setUsernames([]);
                return toast.error("User not found");
            }
        }
        setUsernames(response.data)
    }
  
    return (
        <Wrapper $isOpen={isOpen}>
            <div className="flex items-center">
                <IoIosArrowRoundBack className="cursor-pointer" size={45} onClick={() => {toggle(false)}}/>
                <h3 className="mx-8 text-xl">New Chat</h3>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(searchUserReq)} className="flex py-5 ">
                    <FormField
                        control={form.control}
                        name="usernameSearch"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Input {...field} className="flex-1 text-neutral-600 bg-neutral-300" ref={searchInputRef} placeholder="Search name"/>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
            <div className="mt-[5px]">
                {usernames == null || usernames.length == 0 ? '' : usernames.map((username) => (
                    <Button variant="inverse" className="w-full my-[10px]" key={username._id}>{username.username}</Button>
                ))}
            </div>
        </Wrapper>
    );
};